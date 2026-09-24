import { Product } from './product.model';
import { Category } from '../category/category.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import { bulkUploadValidation } from './product.validation';
import { logStockMovements } from '../inventory/inventory.ledger';
import { buildProductSlug, generateSku, isSkuTaken, mergeLegacySlugs, parseManualSku } from './product.sku';

// costPrice is the moving-average purchase cost kept by Inventory — staff-only data.
// Public product responses never include it.
const HIDE_COST = '-costPrice';

// Fields no storefront card renders, dropped from public *list* responses.
// A listing exists to draw cards; the detail page fetches the whole document by
// slug, and the cart fetches it by id, so nothing loses data here. Between them
// these are most of a product's bytes — `description` is unbounded prose and
// every entry in `variants` carries its own images, description and note.
const LIST_ONLY_EXCLUDE = [
    '-description',
    '-variants',
    '-specifications',
    '-highlights',
    '-insideTheBox',
    '-aiLabels',
    '-metaTitle',
    '-metaDescription',
    '-metaKeywords',
    '-deliveryInfo',
    '-paymentInfo',
    '-termsInfo',
    '-boxSize',
    '-dimensions',
    '-warranty',
    '-shippingInfo',
].join(',');

/**
 * A `?fields=` projection that can never reveal costPrice. Inclusion lists simply lose
 * the costPrice token; exclusion lists (and the default) also exclude it.
 */
function publicFields(raw: unknown): string {
    const tokens = String(typeof raw === 'string' ? raw : '')
        .split(/[,\s]+/)
        .map((t) => t.trim())
        .filter((t) => t && !/^[+-]?costPrice$/i.test(t));
    if (tokens.length === 0) return `-__v,${HIDE_COST},${LIST_ONLY_EXCLUDE}`;
    const exclusion = tokens.every((t) => t.startsWith('-'));
    // An explicit inclusion list is honoured as-is — a caller asking for
    // `fields=name,description` still gets the description.
    return exclusion ? [...tokens, HIDE_COST, LIST_ONLY_EXCLUDE].join(',') : tokens.join(',');
}

/**
 * Hiding costPrice from the projection is not enough: every other query key becomes a
 * Mongo filter (QueryBuilder.filter) and `sort` is passed through, so a shopper could
 * binary-search it (?costPrice[$lte]=N) or rank by it (?sort=-costPrice). Drop any key
 * that mentions costPrice, any top-level operator ($or / $expr / $where …, which could
 * reach it indirectly), and costPrice from the sort.
 */
function stripCostQuery(query: Record<string, unknown>) {
    const mentionsCost = (v: unknown) => {
        try {
            return /costprice/i.test(JSON.stringify(v) ?? '');
        } catch {
            return true;
        }
    };
    for (const key of Object.keys(query)) {
        if (key === 'sort' || key === 'fields') continue;
        if (key.startsWith('$') || /costprice/i.test(key) || mentionsCost(query[key])) delete query[key];
    }
    if (query.sort !== undefined) {
        const sort = String(typeof query.sort === 'string' ? query.sort : '')
            .split(/[,\s]+/)
            .filter((t) => t && !/costprice/i.test(t))
            .join(',');
        if (sort) query.sort = sort;
        else delete query.sort;
    }
}

// Per-row product shape (one entry of bulkUploadValidation.body.products) — used to
// validate each bulk row individually so one bad row doesn't abort the whole batch.
const bulkProductRowSchema = bulkUploadValidation.shape.body.shape.products.element;

// Escape user input before embedding it in a RegExp (prevents regex injection /
// accidental special-char matches in brand + suggest queries).
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fields the listing's ?searchTerm= is matched against. `sku` lets staff find a product
// by its code: the word's plain substring regex already matches an exact SKU ("NF01"),
// case-insensitively, and the fuzzy one also finds it typed unpadded ("nf1").
const SEARCH_FIELDS = ['name', 'description', 'tags', 'colors', 'aiLabels', 'slug', 'sku'];

// Auto-generated SKUs retried after losing a race for the same number.
const SKU_RETRIES = 3;

function isDuplicateKey(err: any, field: string): boolean {
    return err?.code === 11000 && (err.keyPattern?.[field] !== undefined || err.keyValue?.[field] !== undefined);
}

/** A unique-index clash on sku / slug as a 409 the product form can show. */
function duplicateToConflict(err: any): unknown {
    if (isDuplicateKey(err, 'sku')) {
        return new AppError(409, `SKU "${err.keyValue?.sku ?? ''}" is already taken. Leave the SKU empty to get the next free one.`);
    }
    if (isDuplicateKey(err, 'slug')) {
        return new AppError(409, 'Another product already has this product link. Change the name or the SKU.');
    }
    return err;
}

/**
 * Two products saved at the same moment can be handed the same next SKU; the unique
 * index turns the second away (on sku, or on the slug built from it), so it is written
 * again with a freshly generated one. A SKU the admin typed is never swapped.
 */
async function withSkuRetry<T>(autoSku: boolean, write: () => Promise<T>): Promise<T> {
    for (let retry = 0; ; retry++) {
        try {
            return await write();
        } catch (err) {
            const lostRace = autoSku && (isDuplicateKey(err, 'sku') || isDuplicateKey(err, 'slug'));
            if (!lostRace || retry >= SKU_RETRIES) throw duplicateToConflict(err);
        }
    }
}

const ProductService = {
    // ── Get all products (public, with full filtering) ──────────────────
    // `staff` (an admin token was sent — the admin Products page uses this same endpoint)
    // also returns drafts and cost prices; shoppers never see either.
    async getAllProducts(query: Record<string, unknown>, opts: { staff?: boolean } = {}) {
        const staff = Boolean(opts.staff);
        if (!staff) {
            stripCostQuery(query);
            query.fields = publicFields(query.fields);
        }

        // (Product sourcing "country" was removed.) Drop any stale ?country= param
        // so it never leaks into the Mongoose filter.
        delete (query as Record<string, unknown>).country;

        // A single-store catalog: any stale ?shop= param is ignored.
        delete (query as Record<string, unknown>).shop;


        // ── Extra server-side filters (brand / minRating / inStock) ──────────
        // Normalize empty / "all" so they never leak into Mongoose .find().
        // Each builds a Mongoose condition fragment that is AND-combined with the
        // publicScope + the other filters (the search included).

        // brand: case-insensitive exact match; comma-separated → match any (in-list).
        const rawBrand = typeof query.brand === 'string' ? query.brand.trim() : '';
        let brandFilter: Record<string, unknown> | undefined;
        if (rawBrand && rawBrand.toLowerCase() !== 'all') {
            const brands = rawBrand
                .split(',')
                .map((b) => b.trim())
                .filter(Boolean);
            if (brands.length === 1) {
                // anchored, case-insensitive exact match
                brandFilter = { brand: { $regex: `^${escapeRegex(brands[0])}$`, $options: 'i' } };
            } else if (brands.length > 1) {
                brandFilter = {
                    $or: brands.map((b) => ({ brand: { $regex: `^${escapeRegex(b)}$`, $options: 'i' } })),
                };
            }
        }
        // Remove raw brand so QueryBuilder.filter() doesn't do a literal equality match.
        delete query.brand;

        // minRating: rating >= value.
        const minRatingNum = Number(query.minRating);
        const minRating =
            query.minRating !== undefined &&
            query.minRating !== '' &&
            query.minRating !== 'all' &&
            Number.isFinite(minRatingNum)
                ? minRatingNum
                : undefined;
        const ratingFilter: Record<string, unknown> | undefined =
            minRating !== undefined ? { rating: { $gte: minRating } } : undefined;
        delete query.minRating;

        // inStock=true: stock > 0 AND status not 'out-of-stock'.
        const inStock = query.inStock === 'true' || query.inStock === true;
        const stockFilter: Record<string, unknown> | undefined = inStock
            ? { stock: { $gt: 0 }, status: { $ne: 'out-of-stock' } }
            : undefined;
        delete query.inStock;

        // category: match products whose PRIMARY category, sub-category, OR child-category
        // matches the selected category or any of its descendants.
        const rawCategory = typeof query.category === 'string' ? query.category.trim() : '';
        let categoryFilter: Record<string, unknown> | undefined;
        if (rawCategory && rawCategory.toLowerCase() !== 'all') {
            let targetCat: any = null;
            if (rawCategory.match(/^[0-9a-fA-F]{24}$/)) {
                targetCat = await Category.findOne({ _id: rawCategory, isDeleted: false });
            }
            if (!targetCat) {
                targetCat = await Category.findOne({ slug: rawCategory.toLowerCase(), isDeleted: false });
            }

            if (targetCat) {
                const descendantIds: string[] = [String(targetCat._id)];
                const queue: string[] = [String(targetCat._id)];
                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    const children = await Category.find({ parent: currentId, isDeleted: false }).select('_id');
                    for (const child of children) {
                        const childId = String(child._id);
                        descendantIds.push(childId);
                        queue.push(childId);
                    }
                }

                categoryFilter = {
                    $or: [
                        { category: { $in: descendantIds } },
                        { subCategory: { $in: descendantIds } },
                        { childCategory: { $in: descendantIds } },
                    ],
                };
            } else {
                categoryFilter = {
                    $or: [
                        { category: rawCategory },
                        { subCategory: rawCategory },
                        { childCategory: rawCategory },
                    ],
                };
            }
        }
        // Remove raw category so QueryBuilder.filter() doesn't re-add a literal match.
        delete query.category;

        // Collected extra conditions, AND-combined wherever the base filter is built.
        // Drafts (e.g. products quick-added from Inventory with a placeholder image) stay
        // off the storefront until they are finished and published. Kept inside $and so a
        // shopper's own ?status=draft can only narrow the result, never widen it.
        const draftFilter: Record<string, unknown> | undefined = staff ? undefined : { status: { $ne: 'draft' } };

        // ids=a,b,c → exactly those products. The dashboard's "Edit order" needs the full
        // document (variants, stock, today's price) for each product already on an order,
        // and those are not necessarily on the first page of anything.
        const rawIds = typeof query.ids === 'string' ? query.ids : '';
        const wantedIds = rawIds.split(',').map((s) => s.trim()).filter((s) => /^[0-9a-fA-F]{24}$/.test(s));
        const idFilter: Record<string, unknown> | undefined = rawIds.trim()
            // A malformed list must return nothing rather than the whole catalogue.
            ? { _id: { $in: wantedIds } }
            : undefined;
        delete query.ids;

        const extraFilters: Record<string, unknown>[] = [
            brandFilter,
            ratingFilter,
            stockFilter,
            categoryFilter,
            draftFilter,
            idFilter,
        ].filter(Boolean) as Record<string, unknown>[];
        const extraFilterMerge: Record<string, unknown> =
            extraFilters.length > 0 ? { $and: extraFilters } : {};

        // Public listing base scope: non-deleted, approved, and not-hidden products.
        // NOTE: use $ne checks (not strict equals) so legacy/seeded products whose
        // visibility/approvalStatus fields are unset are still shown — only products
        // explicitly 'hidden' / 'pending' / 'rejected' are excluded.
        const publicScope: Record<string, unknown> = {
            isDeleted: false,
            approvalStatus: { $nin: ['pending', 'rejected'] },
            visibility: { $ne: 'hidden' },
            ...extraFilterMerge,
        };

        // If searching, also look for matching categories by name
        let categoryIds: string[] = [];
        if (query.searchTerm) {
            const matchingCategories = await Category.find({
                name: { $regex: query.searchTerm as string, $options: 'i' },
            }).select('_id');
            categoryIds = matchingCategories.map((c) => c._id.toString());
        }

        // The search: every word must match one of SEARCH_FIELDS, or — when the term also
        // names a category — the product sits in that category. Only those two are OR'd;
        // publicScope and every filter from the query string (status, price, flags …) are
        // AND'd around them, so e.g. ?status=active still holds for category matches.
        let searchFilter: Record<string, unknown> | undefined;
        if (query.searchTerm) {
            // QueryBuilder.search() builds the word conditions; only its filter is used.
            const textMatch = new QueryBuilder(Product.find(), { searchTerm: query.searchTerm })
                .search(SEARCH_FIELDS)
                .modelQuery.getFilter();
            searchFilter = categoryIds.length > 0
                ? {
                    $or: [
                        { category: { $in: categoryIds } },
                        { subCategory: { $in: categoryIds } },
                        { childCategory: { $in: categoryIds } },
                        textMatch,
                    ],
                }
                : textMatch;
        }
        const baseFilter: Record<string, unknown> = searchFilter
            ? { ...publicScope, $and: [...((publicScope.$and as Record<string, unknown>[]) || []), searchFilter] }
            : publicScope;

        // Public listing: only approved + visible products are shown.
        const productQuery = new QueryBuilder(
            Product.find(baseFilter)
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('childCategory', 'name slug'),
            query
        )
            .filter()
            .sort()
            .paginate()
            .fields();

        const products = await productQuery.modelQuery;
        const meta = await productQuery.countTotal();
        return { products, meta };
    },

    // ── Get single product ──────────────────────────────────────────────
    async getProductById(id: string) {
        const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } })
            .select(HIDE_COST)
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug')
            .populate('childCategory', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');

        // Increment view count
        await Product.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        return product;
    },

    // ── Get product by slug ─────────────────────────────────────────────
    async getProductBySlug(slug: string) {
        // Public: only approved products are reachable by slug.
        const findOne = (bySlug: Record<string, unknown>) =>
            Product.findOne({ ...bySlug, isDeleted: { $ne: true }, approvalStatus: { $nin: ['pending', 'rejected'] } })
                .select(HIDE_COST)
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('childCategory', 'name slug');
        // An old link (from before a rename or SKU change) still finds the product. The
        // response carries its current `slug`, which the storefront redirects to.
        const product = (await findOne({ slug })) || (await findOne({ legacySlugs: slug }));
        if (!product) throw new AppError(404, 'Product not found');
        await Product.findByIdAndUpdate(product._id, { $inc: { viewCount: 1 } });
        return product;
    },

    // ── Live search suggestions (public, fast, no pagination) ────────────
    // Returns up to `limit` approved+visible products whose name matches `q`
    // (case-insensitive), plus up to 5 matching categories. Blank q → empties.
    async suggestProducts(q: string, limit = 8) {
        const term = typeof q === 'string' ? q.trim() : '';
        if (!term) {
            return { products: [], categories: [] };
        }
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 8;
        const nameRegex = { $regex: escapeRegex(term), $options: 'i' };

        const [products, categories] = await Promise.all([
            Product.find({
                isDeleted: false,
                approvalStatus: { $nin: ['pending', 'rejected'] },
                visibility: { $ne: 'hidden' },
                status: { $ne: 'draft' },
                name: nameRegex,
            })
                .select('_id name slug thumbnail price discount')
                .sort({ totalSold: -1 })
                .limit(safeLimit),
            Category.find({
                isDeleted: { $ne: true },
                isActive: { $ne: false },
                name: nameRegex,
            })
                .select('_id name slug')
                .limit(5),
        ]);

        return { products, categories };
    },

    // ── Distinct brands (public) ─────────────────────────────────────────
    // Non-empty brand strings from approved+visible non-deleted products,
    // sorted alphabetically (case-insensitive).
    async getBrands(): Promise<string[]> {
        const brands: unknown[] = await Product.distinct('brand', {
            isDeleted: false,
            approvalStatus: { $nin: ['pending', 'rejected'] },
            visibility: { $ne: 'hidden' },
        });
        return (brands as string[])
            .filter((b) => typeof b === 'string' && b.trim() !== '')
            .map((b) => b.trim())
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    },

    // ── Admin stats ─────────────────────────────────────────────────────
    async getProductStats() {
        const [total, active, draft, outOfStock] = await Promise.all([
            Product.countDocuments({ isDeleted: false }),
            Product.countDocuments({ isDeleted: false, status: 'active' }),
            Product.countDocuments({ isDeleted: false, status: 'draft' }),
            Product.countDocuments({ isDeleted: false, status: 'out-of-stock' }),
        ]);
        return { total, active, draft, outOfStock };
    },

    // ── SKU ─────────────────────────────────────────────────────────────
    // Staff: the SKU a product with this name would get now (the form pre-fills it).
    async suggestSku(name: string): Promise<string> {
        return generateSku(Product, name);
    },

    // A SKU typed on the form: tidied, well-formed (400) and not used by any other
    // product in any letter case (409). '' → none typed.
    async _claimSku(raw: unknown, excludeId?: string): Promise<string> {
        const sku = parseManualSku(raw);
        if (sku && (await isSkuTaken(Product, sku, excludeId))) {
            throw new AppError(409, `SKU "${sku}" is already taken. Leave the SKU empty to get the next free one.`);
        }
        return sku;
    },

    async _resolveCategoryLineage(payload: any) {
        if (!payload) return;

        // If childCategory is set, ensure subCategory & category are its ancestors
        if (payload.childCategory) {
            const child = await Category.findById(payload.childCategory);
            if (child && child.parent) {
                const parent = await Category.findById(child.parent);
                if (parent) {
                    payload.subCategory = parent._id;
                    if (parent.parent) {
                        payload.category = parent.parent;
                    } else {
                        payload.category = parent._id;
                    }
                }
            }
        } else if (payload.subCategory) {
            // If only subCategory is set, ensure category is its parent
            const sub = await Category.findById(payload.subCategory);
            if (sub && sub.parent) {
                payload.category = sub.parent;
            }
        } else if (payload.category) {
            // If only category is provided, check if it's actually a sub or child category
            const cat = await Category.findById(payload.category);
            if (cat) {
                if (cat.level === 2 && cat.parent) {
                    // childCategory
                    payload.childCategory = cat._id;
                    const p = await Category.findById(cat.parent);
                    if (p) {
                        payload.subCategory = p._id;
                        payload.category = p.parent || p._id;
                    }
                } else if (cat.level === 1 && cat.parent) {
                    // subCategory
                    payload.childCategory = null;
                    payload.subCategory = cat._id;
                    payload.category = cat.parent;
                } else {
                    payload.subCategory = null;
                    payload.childCategory = null;
                }
            }
        }
    },

    // opts.actorId → recorded as "by" on the opening stock movement.
    // opts.skipOpeningMovement → the caller (Inventory quick-add) writes its own.
    async createProduct(payload: any, opts: { actorId?: string; skipOpeningMovement?: boolean } = {}) {
        // The link is always name + SKU, built by the model's save hook — a slug sent with
        // the form is not used. No SKU typed → the hook generates the next short one.
        delete payload.slug;
        delete payload.legacySlugs;
        const sku = await this._claimSku(payload.sku);
        if (sku) payload.sku = sku;
        else delete payload.sku;
        await this._resolveCategoryLineage(payload);
        // Admin products are auto-approved and go live immediately.
        const product = await withSkuRetry(!sku, () =>
            Product.create({ ...payload, approvalStatus: 'approved', approvedAt: new Date() })
        );

        // Update category product count
        if (payload.category) await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });
        if (payload.subCategory) await Category.findByIdAndUpdate(payload.subCategory, { $inc: { productCount: 1 } });
        if (payload.childCategory) await Category.findByIdAndUpdate(payload.childCategory, { $inc: { productCount: 1 } });

        // Stock ledger: the starting stock (fire-and-forget).
        if (!opts.skipOpeningMovement && Number(product.stock) > 0) {
            logStockMovements([{
                product: product._id,
                type: 'opening',
                quantity: Number(product.stock),
                balanceAfter: Number(product.stock),
                unitCost: Number(product.costPrice) > 0 ? Number(product.costPrice) : null,
                note: 'Opening stock — product created',
                createdBy: opts.actorId,
            }]);
        }

        return product;
    },

    // ── Update product ──────────────────────────────────────────────────
    // Stock also changes through Inventory and orders while the product form is open, so:
    //  • the form sends `stock` only when the admin changed it, with `expectedStock` (the
    //    count it loaded) — if the stock has moved since, the save is refused (409);
    //  • a variant sent without `stock` keeps its current stock.
    // The write is compare-and-set on the stock values it read, so a sale landing between
    // the read and the write is never overwritten either.
    async updateProduct(id: string, payload: any, actorId?: string) {
        // Remove discount from payload — it's auto-calculated in pre-save
        delete payload.discount;
        // The link is rebuilt below from the name and SKU — never taken from the request.
        delete payload.slug;
        delete payload.legacySlugs;
        const expectedStock = typeof payload.expectedStock === 'number' ? payload.expectedStock : undefined;
        delete payload.expectedStock;
        if (payload.category !== undefined || payload.subCategory !== undefined || payload.childCategory !== undefined) {
            await this._resolveCategoryLineage(payload);
        }

        // ── SKU + link ── findOneAndUpdate skips the model's save hook, so its rules are
        // applied here: a new name or SKU rebuilds the slug, and the old slug is kept.
        let current: any = null;
        let autoSku = false;
        if (payload.name !== undefined || payload.sku !== undefined) {
            current = await Product.findOne({ _id: id, isDeleted: false }).select('name sku slug legacySlugs').lean();
            if (!current) throw new AppError(404, 'Product not found');
            const sentSku = payload.sku === undefined ? undefined : String(payload.sku ?? '').trim();
            delete payload.sku;
            // An unchanged SKU is left alone, even one from before the short format.
            if (sentSku !== undefined && sentSku.toUpperCase() !== String(current.sku || '').toUpperCase()) {
                const sku = await this._claimSku(sentSku, id);
                if (sku) payload.sku = sku;
                else autoSku = true; // emptied on the form → generate one
            }
            if (!payload.sku && !current.sku) autoSku = true;
        }
        // Called per write, so a retry after losing a SKU race gets a fresh number.
        const linkFields = async (): Promise<Record<string, unknown>> => {
            if (!current) return {};
            const name = payload.name !== undefined ? String(payload.name).trim() : current.name;
            const out: Record<string, unknown> = {};
            if (autoSku) out.sku = await generateSku(Product, name);
            const sku = String(out.sku ?? payload.sku ?? current.sku);
            if (name === current.name && sku === current.sku) return out;
            const slug = buildProductSlug(name, sku);
            if (slug !== current.slug) {
                out.slug = slug;
                out.legacySlugs = mergeLegacySlugs(current.legacySlugs, current.slug, slug);
            }
            return out;
        };

        const eqOrMissing = (v: unknown) => (v === undefined || v === null ? { $in: [null, 0] } : v);
        let before: any = null;
        let product: any = null;
        for (let attempt = 0; attempt < 5 && !product; attempt++) {
            before = await Product.findOne({ _id: id, isDeleted: false }).select('stock variants._id variants.stock').lean();
            if (!before) throw new AppError(404, 'Product not found');

            const update = { ...payload };
            const filter: Record<string, unknown> = { _id: id, isDeleted: false };
            if (update.stock !== undefined) {
                if (expectedStock !== undefined && Number(before.stock || 0) !== expectedStock) {
                    throw new AppError(409, `The stock changed since you opened this product (it is now ${Number(before.stock || 0)}). Reload the page to see it, or change stock from Inventory.`);
                }
                filter.stock = eqOrMissing(before.stock);
            }
            if (Array.isArray(update.variants)) {
                const current = new Map<string, any>((before.variants || []).map((v: any) => [String(v._id), v]));
                const guards: Record<string, unknown>[] = [];
                update.variants = update.variants.map((v: any) => {
                    const cur = v && typeof v.stock !== 'number' && v._id ? current.get(String(v._id)) : null;
                    if (!cur) return v;
                    guards.push({ variants: { $elemMatch: { _id: cur._id, stock: eqOrMissing(cur.stock) } } });
                    return { ...v, stock: Number(cur.stock || 0) };
                });
                if (guards.length) filter.$and = guards;
            }

            product = await withSkuRetry(autoSku, async () =>
                Product.findOneAndUpdate(filter, { ...update, ...(await linkFields()) }, { new: true, runValidators: true })
                    .populate('category', 'name slug')
                    .populate('subCategory', 'name slug')
                    .populate('childCategory', 'name slug')
            );
            // No match = the stock moved between the read and the write — read again.
        }
        if (!product) throw new AppError(409, 'The stock changed while saving — please try again');

        if (payload.stock !== undefined) {
            const delta = Number(product.stock || 0) - Number(before.stock || 0);
            if (delta !== 0) {
                logStockMovements([{
                    product: product._id,
                    type: 'adjustment',
                    quantity: delta,
                    balanceAfter: Number(product.stock || 0),
                    unitCost: Number(product.costPrice) > 0 ? Number(product.costPrice) : null,
                    note: 'Stock changed on the product form',
                    createdBy: actorId,
                }]);
            }
        }
        return product;
    },

    // ── Delete product (soft) ───────────────────────────────────────────
    async deleteProduct(id: string) {
        const product = await Product.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
        if (!product) throw new AppError(404, 'Product not found');

        // Update category product count
        await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
        return product;
    },

    // ── Bulk status update ──────────────────────────────────────────────
    async bulkUpdateStatus(ids: string[], status: string) {
        const result = await Product.updateMany(
            { _id: { $in: ids }, isDeleted: false },
            { status }
        );
        return result;
    },

    // ── Bulk delete ─────────────────────────────────────────────────────
    async bulkDelete(ids: string[]) {
        const result = await Product.updateMany({ _id: { $in: ids } }, { isDeleted: true });
        return result;
    },

    // ── Bulk create / upload ─────────────────────────────────────────────
    // Validates each row independently; valid rows are inserted, invalid rows are
    // skipped and reported. Never aborts the whole batch for one bad row.
    async bulkCreate(items: any[], actorId?: string) {
        let created = 0;
        const failed: { index: number; error: string }[] = [];

        for (let index = 0; index < items.length; index++) {
            const parsed = bulkProductRowSchema.safeParse(items[index]);
            if (!parsed.success) {
                const firstIssue = parsed.error.issues[0];
                const path = firstIssue?.path?.join('.') || 'unknown';
                failed.push({ index, error: `${path}: ${firstIssue?.message || 'Invalid product'}` });
                continue;
            }

            try {
                const payload: any = { ...parsed.data, approvalStatus: 'approved', approvedAt: new Date() };

                await this._resolveCategoryLineage(payload);
                // Use create() (not insertMany) so pre-save hooks run per row
                // (slug, sku, discount, variant labels) — same as single create.
                // The row schema has no sku, so every row gets a generated one.
                const doc = await withSkuRetry(true, () => Product.create(payload));
                if (payload.category) await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });
                if (payload.subCategory) await Category.findByIdAndUpdate(payload.subCategory, { $inc: { productCount: 1 } });
                if (payload.childCategory) await Category.findByIdAndUpdate(payload.childCategory, { $inc: { productCount: 1 } });
                created++;

                // Stock ledger: the starting stock (fire-and-forget).
                if (Number(doc.stock) > 0) {
                    logStockMovements([{
                        product: doc._id,
                        type: 'opening',
                        quantity: Number(doc.stock),
                        balanceAfter: Number(doc.stock),
                        unitCost: Number(doc.costPrice) > 0 ? Number(doc.costPrice) : null,
                        note: 'Opening stock — bulk upload',
                        createdBy: actorId,
                    }]);
                }
            } catch (err: any) {
                failed.push({ index, error: err?.message || 'Failed to create product' });
            }
        }

        return { created, failed };
    },

    // ── Inventory: low-stock products (admin) ────────────────────────────
    async getLowStockProducts(threshold = 5) {
        const safeThreshold = Number.isFinite(threshold) ? threshold : 5;
        return await Product.find({ isDeleted: false, stock: { $lte: safeThreshold } })
            .populate('category', 'name slug')
            .sort({ stock: 1 });
    },

    // ── Update stock (no longer needed — stock field removed) ───────────
    // Kept for API compatibility; status can still be set to out-of-stock manually

    // ── Featured products (top selling active products) ─────────────────
    async getFeaturedProducts(limit = 8) {
        return await Product.find({ isDeleted: false, status: 'active', approvalStatus: { $nin: ['pending', 'rejected'] } })
            .select(HIDE_COST)
            .populate('category', 'name slug')
            .sort({ totalSold: -1 })
            .limit(limit);
    },

    // ── Related products (same category) ────────────────────────────────
    async getRelatedProducts(productId: string, categoryId: string, limit = 6) {
        const filter: any = {
            _id: { $ne: productId },
            isDeleted: false,
            status: 'active',
            approvalStatus: { $nin: ['pending', 'rejected'] },
        };
        if (categoryId) {
            filter.$or = [
                { category: categoryId },
                { subCategory: categoryId },
                { childCategory: categoryId },
            ];
        }
        let products = await Product.find(filter)
            .select(HIDE_COST)
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug')
            .populate('childCategory', 'name slug')
            .sort({ rating: -1 })
            .limit(limit);

        if (products.length === 0) {
            products = await Product.find({
                _id: { $ne: productId },
                isDeleted: false,
                status: 'active',
                approvalStatus: { $nin: ['pending', 'rejected'] },
            })
                .select(HIDE_COST)
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('childCategory', 'name slug')
                .sort({ totalSold: -1, rating: -1 })
                .limit(limit);
        }
        return products;
    },

    // ── Increment stat (like, share, view, comment) ─────────────────────
    async incrementStat(id: string, field: string) {
        const allowedFields = ['likeCount', 'shareCount', 'viewCount', 'commentCount'];
        if (!allowedFields.includes(field)) {
            throw new AppError(400, `Invalid stat field: ${field}`);
        }
        const product = await Product.findByIdAndUpdate(
            id,
            { $inc: { [field]: 1 } },
            { new: true }
        ).select(HIDE_COST); // public endpoint
        if (!product) throw new AppError(404, 'Product not found');
        return product;
    },

// ── ADMIN QC: List products awaiting moderation ──────────────────────
    // Default: products not yet approved (pending + rejected). Filter by ?status=pending|rejected|approved|all.
    async getPendingProducts(query: Record<string, unknown>) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter: Record<string, unknown> = { isDeleted: false };
        const status = typeof query.status === 'string' ? query.status : '';
        if (status === 'pending' || status === 'rejected' || status === 'approved') {
            filter.approvalStatus = status;
        } else if (status === 'all') {
            // no approvalStatus filter
        } else {
            // default: everything that still needs / had moderation attention
            filter.approvalStatus = { $ne: 'approved' };
        }

        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await Product.countDocuments(filter);
        return { products, total, page, limit, totalPages: Math.ceil(total / limit) };
    },

    // ── ADMIN QC: Approve a product ──────────────────────────────────────
    async approveProduct(id: string) {
        const product = await Product.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { approvalStatus: 'approved', approvedAt: new Date(), rejectionReason: '' },
            { new: true }
        ).populate('category', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');

        // ── Activity log (fire-and-forget) ──
        try {
            const { ActivityLogService } = require('../activityLog/activityLog.service');
            ActivityLogService.logActivity({
                action: 'product_approve',
                target: `Product:${id}`,
                meta: { name: product.name },
            }).catch(() => {});
        } catch {
            // never block product approval
        }

        return product;
    },

    // ── ADMIN QC: Reject a product (with reason) ─────────────────────────
    async rejectProduct(id: string, reason: string) {
        const product = await Product.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { approvalStatus: 'rejected', rejectionReason: reason || 'Did not meet our requirements.' },
            { new: true }
        ).populate('category', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');

        // ── Activity log (fire-and-forget) ──
        try {
            const { ActivityLogService } = require('../activityLog/activityLog.service');
            ActivityLogService.logActivity({
                action: 'product_reject',
                target: `Product:${id}`,
                meta: { name: product.name, reason: reason || '' },
            }).catch(() => {});
        } catch {
            // never block product rejection
        }

        return product;
    },
};

export default ProductService;

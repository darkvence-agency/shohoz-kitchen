import { Product } from './product.model';
import { Category } from '../category/category.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import { bulkUploadValidation } from './product.validation';

// Per-row product shape (one entry of bulkUploadValidation.body.products) — used to
// validate each bulk row individually so one bad row doesn't abort the whole batch.
const bulkProductRowSchema = bulkUploadValidation.shape.body.shape.products.element;

// Escape user input before embedding it in a RegExp (prevents regex injection /
// accidental special-char matches in brand + suggest queries).
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ProductService = {
    // ── Get all products (public, with full filtering) ──────────────────
    async getAllProducts(query: Record<string, unknown>) {
        // (Product sourcing "country" was removed.) Drop any stale ?country= param
        // so it never leaks into the Mongoose filter.
        delete (query as Record<string, unknown>).country;

        // A single-store catalog: any stale ?shop= param is ignored.
        delete (query as Record<string, unknown>).shop;


        // ── Extra server-side filters (brand / minRating / inStock) ──────────
        // Normalize empty / "all" so they never leak into Mongoose .find().
        // Each builds a Mongoose condition fragment that is AND-combined with the
        // publicScope + the other filters, and is also re-injected into the
        // search+category rebuild path below.

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
        const extraFilters: Record<string, unknown>[] = [
            brandFilter,
            ratingFilter,
            stockFilter,
            categoryFilter,
        ].filter(Boolean) as Record<string, unknown>[];
        const extraFilterMerge: Record<string, unknown> =
            extraFilters.length > 0 ? { $and: extraFilters } : {};

        // Public listing base scope: non-deleted, approved, and not-hidden products.
        // NOTE: use $ne checks (not strict equals) so legacy/seeded products whose
        // visibility/approvalStatus fields are unset are still shown — only products
        // explicitly 'hidden' / 'pending' / 'rejected' are excluded.
        // (Shared by both the normal path and the search+category rebuild path.)
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

        // Build base query — if we found matching categories, include them
        // Public listing: only approved + visible products are shown.
        let baseFilter: any = { ...publicScope };
        if (categoryIds.length > 0 && query.searchTerm) {
            // Will be merged with search conditions via $and
            baseFilter = {
                ...publicScope,
                $or: [
                    { category: { $in: categoryIds } },
                    { subCategory: { $in: categoryIds } },
                    { childCategory: { $in: categoryIds } },
                    // The QueryBuilder.search() will add field-level search conditions
                    { _searchPlaceholder: true },
                ],
            };
        }

        const productQuery = new QueryBuilder(
            Product.find(categoryIds.length > 0 ? { ...publicScope } : baseFilter)
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('childCategory', 'name slug'),
            query
        )
            .search(['name', 'description', 'tags', 'colors', 'aiLabels', 'slug'])
            .filter()
            .sort()
            .paginate()
            .fields();

        // If we have matching category IDs, merge them into the query
        if (categoryIds.length > 0 && query.searchTerm) {
            const currentFilter = productQuery.modelQuery.getFilter();
            productQuery.modelQuery = Product.find({
                ...publicScope,
                $or: [
                    { category: { $in: categoryIds } },
                    { subCategory: { $in: categoryIds } },
                    { childCategory: { $in: categoryIds } },
                    ...(currentFilter.$and || [currentFilter]),
                ],
            })
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('childCategory', 'name slug');

            // Re-apply sort, paginate, fields
            const sort = (query?.sort as string)?.split(',')?.join(' ') || '-createdAt';
            const page = Number(query?.page) || 1;
            const limit = Number(query?.limit) || 10;
            const skip = (page - 1) * limit;
            productQuery.modelQuery = productQuery.modelQuery.sort(sort).skip(skip).limit(limit);
        }

        const products = await productQuery.modelQuery;
        const meta = await productQuery.countTotal();
        return { products, meta };
    },

    // ── Get single product ──────────────────────────────────────────────
    async getProductById(id: string) {
        const product = await Product.findOne({ _id: id, isDeleted: { $ne: true } })
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
        const product = await Product.findOne({ slug, isDeleted: { $ne: true }, approvalStatus: { $nin: ['pending', 'rejected'] } })
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug')
            .populate('childCategory', 'name slug');
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

    // ── Create product ──────────────────────────────────────────────────
    // Guarantee a globally-unique slug (the slug index is unique). The product form
    // pre-fills a name-derived slug with NO uniqueness suffix, so two same-named products
    // would otherwise collide with a cryptic E11000 on create. Append -1, -2, … only on an
    // actual collision, so unique names keep a clean, SEO-friendly slug.
    async _uniqueSlug(desired: string, name: string): Promise<string> {
        let base = String(desired || name || 'product')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        if (!base) base = 'product';
        let slug = base;
        let n = 1;
        // eslint-disable-next-line no-await-in-loop
        while (await Product.exists({ slug })) {
            slug = `${base}-${n++}`;
        }
        return slug;
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

    async createProduct(payload: any) {
        payload.slug = await this._uniqueSlug(payload.slug, payload.name);
        await this._resolveCategoryLineage(payload);
        // Admin products are auto-approved and go live immediately.
        const product = await Product.create({ ...payload, approvalStatus: 'approved', approvedAt: new Date() });

        // Update category product count
        if (payload.category) await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });
        if (payload.subCategory) await Category.findByIdAndUpdate(payload.subCategory, { $inc: { productCount: 1 } });
        if (payload.childCategory) await Category.findByIdAndUpdate(payload.childCategory, { $inc: { productCount: 1 } });

        return product;
    },

    // ── Update product ──────────────────────────────────────────────────
    async updateProduct(id: string, payload: any) {
        // Remove discount from payload — it's auto-calculated in pre-save
        delete payload.discount;
        if (payload.category !== undefined || payload.subCategory !== undefined || payload.childCategory !== undefined) {
            await this._resolveCategoryLineage(payload);
        }
        const product = await Product.findOneAndUpdate(
            { _id: id, isDeleted: false },
            payload,
            { new: true, runValidators: true }
        )
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug')
            .populate('childCategory', 'name slug');
        if (!product) throw new AppError(404, 'Product not found');
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
    async bulkCreate(items: any[]) {
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
                await Product.create(payload);
                if (payload.category) await Category.findByIdAndUpdate(payload.category, { $inc: { productCount: 1 } });
                if (payload.subCategory) await Category.findByIdAndUpdate(payload.subCategory, { $inc: { productCount: 1 } });
                if (payload.childCategory) await Category.findByIdAndUpdate(payload.childCategory, { $inc: { productCount: 1 } });
                created++;
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
        );
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

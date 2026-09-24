import crypto from 'crypto';
import { Types } from 'mongoose';
import { Order, resyncOrderCounter } from './order.model';
import { ORDER_ID_PREFIXES, formatOrderId, parseOrderId } from './orderCounter.model';
import type { CreateAdminOrderPayload, UpdateAdminOrderPayload } from './order.validation';
import { Product } from '../product/product.model';
import { User } from '../user/user.model';
import { Coupon } from '../coupon/coupon.model';
import AppError from '../../utils/AppError';
import QueryBuilder from '../../utils/QueryBuilder';
import { notifyOrderToWhatsApp } from '../../utils/whatsappNotify';
import { computeShippingCost, isDeliveryArea } from '../shipping/shipping.service';
import { logStockMovements, variantOf, StockMovementInput } from '../inventory/inventory.ledger';
import { normalizePhone, phonePattern } from '../fraud/fraud.rules';

/**
 * Options only the dashboard's "New order" passes to createOrder. Checkout and guest
 * checkout never set them, so prices or a delivery charge a customer sends are ignored.
 */
export interface CreateOrderOptions {
    /** Honour each line's unitPrice / originalPrice and the `shipping` mode from the payload. */
    allowPriceOverride?: boolean;
    /** The staff member placing the order: stored as createdBy, and the order's source is 'admin'. */
    adminId?: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** An amount staff typed on a dashboard order: a finite number, not negative. */
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/** A save refused by the unique orderId index: the order counter fell behind the IDs in use. */
const isDuplicateOrderId = (e: any) =>
    e?.code === 11000 && Boolean(e?.keyPattern?.orderId || e?.keyValue?.orderId || /orderId/.test(String(e?.message)));

// ── Stock ledger (Inventory → Movements) ────────────────────────
// Every place below that changes product.stock also logs a ledger row, AFTER the stock
// change succeeded, fire-and-forget: bookkeeping can never break an order flow.

/**
 * The variant an order line was bought as: the first variant whose colour and size agree
 * (case-insensitive) — the same match checkout uses for the price.
 */
function matchVariant(variants: any[] | undefined, color?: string, size?: string): any | null {
    if (!color && !size) return null;
    const same = (a: unknown, b: unknown) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
    return (variants || []).find((v: any) => (!color || same(v.color, color)) && (!size || same(v.size, size))) || null;
}

/**
 * The unit price the shop charges for a line right now.
 * A matched variant's `price` is already its sale price — the product pre-save hook
 * derives `variant.discount` FROM originalPrice vs price — so it is charged as it is.
 * (Taking `discount` off it again, as checkout once did, discounted variant lines twice.)
 * Without a variant: the product price while its offer window is open, else the list price.
 */
function catalogUnitPrice(product: any, variant: any | null): number {
    if (variant) return variant.price;
    const now = new Date();
    const start = product.offerStartDate ? new Date(product.offerStartDate) : null;
    const end = product.offerEndDate ? new Date(product.offerEndDate) : null;
    const afterStart = !start || isNaN(start.getTime()) || now.getTime() >= start.getTime();
    const beforeEnd = !end || isNaN(end.getTime()) || now.getTime() <= end.getTime();
    const offerActive = afterStart && beforeEnd;
    if (offerActive) return product.price;
    return product.originalPrice && product.originalPrice > 0 ? product.originalPrice : product.price;
}

/** The line's list ("was") price: the variant's / product's originalPrice when above `charged`, else `charged`. */
function catalogListPrice(product: any, variant: any | null, charged: number): number {
    const op = Number(variant ? variant.originalPrice : product.originalPrice) || 0;
    return op > 0 && op > charged ? op : charged;
}

/** Whole percent `price` is below `originalPrice`: never negative, and 0 without a list price. */
function discountPercentOf(originalPrice: number, price: number): number {
    if (!(originalPrice > 0)) return 0;
    return Math.max(0, Math.round(((originalPrice - price) / originalPrice) * 100));
}

/**
 * Accounts on file for a Bangladeshi mobile number (local form, 01XXXXXXXXX), however
 * it was saved: "01712345678", "+8801712345678", "8801712345678", or with spaces or
 * dashes. The exact forms are tried first; the pattern search only runs when they
 * turn up no customer.
 */
async function findUsersByPhone(local: string): Promise<any[]> {
    const live = { isDeleted: { $ne: true } };
    const exact = await User.find({ ...live, phone: { $in: [local, `+88${local}`, `88${local}`] } }).limit(10);
    if (exact.some((u: any) => u.role === 'user')) return exact;
    const loose = await User.find({
        ...live,
        _id: { $nin: exact.map((u: any) => u._id) },
        phone: { $regex: phonePattern(local) },
    }).limit(10);
    return [...exact, ...loose.filter((u: any) => normalizePhone(u.phone) === local)];
}

/**
 * A stock $inc for a product and, when the line was a variant, that variant too — so the
 * variant counts (shown on the storefront and in Inventory) move with the sellable total.
 */
function stockInc(delta: number, variantId: unknown, extra: Record<string, number> = {}) {
    const inc: Record<string, number> = { stock: delta, ...extra };
    if (!variantId) return { update: { $inc: inc }, options: {} as Record<string, unknown> };
    inc['variants.$[line].stock'] = delta;
    return { update: { $inc: inc }, options: { arrayFilters: [{ 'line._id': variantId }] } as Record<string, unknown> };
}

/**
 * The amount a coupon's discount is computed on. For a product / category coupon only the
 * matching lines count, not the whole subtotal; for every other coupon it is the subtotal.
 * `staged` are the priced lines (each with its product document).
 */
function couponEligibleBase(coupon: any, subtotal: number, staged: { product: any; itemTotal: number }[]): number {
    const applicableTo = coupon?.applicableTo || 'all';
    if (coupon && applicableTo === 'specific_products') {
        const set = new Set((coupon.specificProducts || []).map((x: any) => x.toString()));
        return staged.reduce((s, st) => s + (set.has(st.product._id.toString()) ? st.itemTotal : 0), 0);
    }
    if (coupon && applicableTo === 'specific_categories') {
        const set = new Set((coupon.specificCategories || []).map((x: any) => x.toString()));
        return staged.reduce((s, st) => {
            const cat = st.product.category ? st.product.category.toString() : null;
            const sub = st.product.subCategory ? st.product.subCategory.toString() : null;
            const child = st.product.childCategory ? st.product.childCategory.toString() : null;
            const match = (cat && set.has(cat)) || (sub && set.has(sub)) || (child && set.has(child));
            return s + (match ? st.itemTotal : 0);
        }, 0);
    }
    return subtotal;
}

/**
 * What an already-accepted coupon is worth against that base. Whether the coupon may be
 * used at all (dates, limits, minimum spend) is the caller's business: checkout decides it
 * before redeeming, while an edit re-prices a coupon the order has already redeemed.
 */
function couponValue(coupon: any, eligibleBase: number): { discount: number; freeShipping: boolean } {
    if (coupon.discountType === 'free_shipping') return { discount: 0, freeShipping: true };
    let discount: number;
    if (coupon.discountType === 'percentage') {
        discount = (eligibleBase * coupon.discountValue) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    } else {
        discount = coupon.discountValue;
    }
    // Never let the discount exceed the eligible base (guards against negative totals).
    return { discount: Math.min(discount, eligibleBase), freeShipping: false };
}

/**
 * The variant _id an order line refers to, looked up from the product as it stands now.
 * null when the line has no colour / size, or when the variant it named is gone — in both
 * cases only the product's own stock moves. The product is read without the `active` /
 * `isDeleted` filters on purpose: stock owed back to a product still has to go back once
 * the product has been drafted or removed from the shop.
 */
async function lineVariantId(item: { product: unknown; color?: string; size?: string }): Promise<unknown> {
    if (!item.color && !item.size) return null;
    const p: any = await Product.findById(item.product).select('variants._id variants.color variants.size').lean();
    return matchVariant(p?.variants, item.color, item.size)?._id || null;
}

/** Put an order line's quantity back into stock; returns the product's stock + cost after. */
async function restockLine(item: any) {
    const variantId = await lineVariantId(item);
    const { update, options } = stockInc(item.quantity, variantId);
    return Product.findByIdAndUpdate(item.product, update, { ...options, new: true })
        .select('stock costPrice')
        .lean();
}

/** Ledger row for stock that came back from an order line (cancel / return). */
function restockEntry(order: any, item: any, after: any, type: 'cancel' | 'return', note: string, createdBy?: string): StockMovementInput | null {
    if (!after) return null;
    return {
        product: item.product,
        type,
        quantity: Number(item.quantity) || 0,
        balanceAfter: Number(after.stock) || 0,
        variant: variantOf(item),
        unitCost: Number(after.costPrice) > 0 ? Number(after.costPrice) : null,
        note,
        order: order?._id,
        createdBy: createdBy || null,
    };
}

/** Write ledger rows, dropping the ones there was nothing to record for. */
function logMovements(entries: (StockMovementInput | null)[]) {
    try {
        logStockMovements(entries.filter(Boolean) as StockMovementInput[]);
    } catch {
        // never block the order flow
    }
}

/**
 * Fraud check: once an order closes (cancelled, delivered, returned…) its flag, if it is
 * still waiting for review, is closed too. Awaited, so the admin's refetch right after
 * sees it, but it never throws and does nothing for open statuses. Lazy require avoids
 * a circular import (fraud.service uses OrderService to cancel).
 */
async function closeFraudFlag(orderId: unknown, status: string, actorId?: string) {
    try {
        const { default: FraudService } = require('../fraud/fraud.service');
        await FraudService.closeForOrder(orderId, status, actorId);
    } catch {
        // never block the order flow
    }
}

// ── Editing an order ────────────────────────────────────────────

// The statuses an order's details may still be changed in. Past 'processing' it is packed
// or on its way, and once it is cancelled / returned / refunded its stock has already gone
// back — an edit then would move the same units a second time.
const EDITABLE_STATUSES = ['pending', 'confirmed', 'processing'];

/**
 * Why this order cannot be edited, or null when it can be. Steadfast offers no edit and no
 * cancel, so once a parcel is with them nothing typed here would ever reach the rider: the
 * shop chose to refuse the edit rather than let the two quietly disagree.
 */
function editBlockedReason(order: any): string | null {
    for (const pkg of order.packages || []) {
        if (pkg.consignmentId) {
            return 'This order is already booked with Steadfast, and their API has no way to change a parcel. Make the correction in the Steadfast panel.';
        }
        if (pkg.courierAttemptAt) {
            return 'A send to Steadfast for this order has not finished yet. Use the courier card to check it first, then edit.';
        }
        if (pkg.trackingNumber) {
            return 'This order already carries a courier tracking number, so it can no longer be edited.';
        }
    }
    if (!EDITABLE_STATUSES.includes(order.status)) {
        return `An order that is "${order.status}" can no longer be edited — only its status and notes can still change.`;
    }
    return null;
}

/**
 * The `freeShipping` flag per line, which the delivery-charge rules need. An edit that
 * restaged its lines already holds the products, so they are not read a second time.
 */
async function freeShippingFlags(items: any[], staged: { product: any }[]): Promise<{ freeShipping: boolean }[]> {
    if (staged.length) return staged.map((s) => ({ freeShipping: Boolean(s.product?.shippingConfig?.freeShipping) }));
    const products = await Product.find({ _id: { $in: items.map((it) => it.product) } }).select('shippingConfig').lean();
    const byId = new Map(products.map((p: any) => [String(p._id), Boolean(p.shippingConfig?.freeShipping)]));
    return items.map((it) => ({ freeShipping: byId.get(String(it.product)) || false }));
}

/** How an order line is matched against the same line in an edit: product + colour + size. */
function lineKey(product: unknown, color?: string, size?: string): string {
    return [
        String(product),
        String(color || '').trim().toLowerCase(),
        String(size || '').trim().toLowerCase(),
    ].join('|');
}

// ── Status helpers ──────────────────────────────────────────────
const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt', 'delivered'];

// Compute the overall order status from its packages (least-advanced active package wins)
function computeOrderStatus(packages: any[]): string {
    if (!packages || packages.length === 0) return 'pending';
    const inactive = (s: string) => s === 'cancelled' || s === 'returned' || s === 'refunded';
    const active = packages.filter(p => !inactive(p.status));
    if (active.length === 0) {
        // everything cancelled/returned/refunded → reflect that
        if (packages.every(p => p.status === 'refunded')) return 'refunded';
        if (packages.every(p => p.status === 'returned')) return 'returned';
        return 'cancelled';
    }
    if (active.every(p => p.status === 'delivered')) return 'delivered';
    // otherwise the least-advanced active package determines progress
    let minIdx = STATUS_ORDER.length - 1;
    for (const p of active) {
        const idx = STATUS_ORDER.indexOf(p.status);
        if (idx >= 0 && idx < minIdx) minIdx = idx;
    }
    return STATUS_ORDER[minIdx] || 'pending';
}

// Staff notes live in the order timeline as `admin_note`; customers must never see them.
function withoutStaffNotes(order: any) {
    // toJSON (not toObject) — the schema adds its virtuals only on toJSON.
    const o = typeof order?.toJSON === 'function' ? order.toJSON() : order;
    return { ...o, timeline: (o.timeline || []).filter((t: any) => t.status !== 'admin_note') };
}

const OrderService = {
    async getAllOrders(query: Record<string, unknown>) {
        const orderQuery = new QueryBuilder(
            Order.find().populate('user', 'firstName lastName email phone').populate('items.product', 'name thumbnail'),
            query
        )
            // Admin search box: match by order number, customer name or phone.
            .search(['orderId', 'shippingAddress.fullName', 'shippingAddress.phone'])
            .filter()
            .sort()
            .paginate();

        const orders = await orderQuery.modelQuery;
        const meta = await orderQuery.countTotal();
        return { orders, meta };
    },

    async getMyOrders(userId: string, query: Record<string, unknown>) {
        const orderQuery = new QueryBuilder(
            Order.find({ user: userId }).populate('items.product', 'name thumbnail slug'),
            query
        )
            .search(['orderId'])   // search box → order number
            .filter()              // status tab → order status
            .sort()
            .paginate();

        const orders = await orderQuery.modelQuery;
        const meta = await orderQuery.countTotal();
        return { orders: orders.map(withoutStaffNotes), meta };
    },

    async getOrderById(id: string, userId?: string) {
        const filter: any = { _id: id };
        if (userId) filter.user = userId; // non-admin can only see their own

        const order = await Order.findOne(filter)
            .populate('user', 'firstName lastName email phone')
            .populate('items.product', 'name thumbnail slug price');
        if (!order) throw new AppError(404, 'Order not found');
        // A customer reading their own order gets no staff notes.
        return userId ? withoutStaffNotes(order) : order;
    },

    // opts is set only by createAdminOrder (see CreateOrderOptions).
    async createOrder(userId: string, payload: any, opts: CreateOrderOptions = {}) {
        const { items, shippingAddress, paymentMethod, paymentDetails, couponCode, note, zoneId, deliveryArea } = payload;
        const override = opts.allowPriceOverride === true;
        const area = isDeliveryArea(deliveryArea) ? deliveryArea : undefined;

        // Get product details and calculate totals
        let subtotal = 0;
        const orderItems: any[] = [];

        // Each line is priced from the product as it is RIGHT NOW (the chosen colour /
        // size variant's price, else the product's). Only a dashboard order may replace
        // that with the price staff typed.
        const stagedItems: any[] = [];
        for (const item of items) {
            const product = await Product.findOne({ _id: item.product, isDeleted: false, status: 'active' });
            if (!product) throw new AppError(404, `Product not found: ${item.product}`);
            if (product.stock < item.quantity) throw new AppError(400, `Insufficient stock for: ${product.name}`);

            const variant = matchVariant(product.variants, item.color, item.size);
            const catalogPrice = catalogUnitPrice(product, variant);
            const priceOverridden = override && isAmount(item.unitPrice);
            const unitPrice = priceOverridden ? round2(item.unitPrice) : catalogPrice;
            // The "was" price: what staff typed, else the shop's list price — never below
            // what is charged, so a price raised by staff shows no discount.
            const originalPrice = override && isAmount(item.originalPrice)
                ? round2(item.originalPrice)
                : Math.max(catalogListPrice(product, variant, catalogPrice), unitPrice);
            const itemTotal = round2(unitPrice * item.quantity);
            subtotal += itemTotal;

            stagedItems.push({ product, variant, item, itemTotal, unitPrice, originalPrice, priceOverridden });
        }
        subtotal = round2(subtotal);

        // Build order items with pre-generated _ids (so the package can reference them)
        for (const staged of stagedItems) {
            const { product, variant, item, itemTotal, unitPrice, originalPrice, priceOverridden } = staged;
            const _id = new Types.ObjectId();

            orderItems.push({
                _id,
                product: product._id,
                name: product.name,
                thumbnail: variant?.images?.length ? variant.images[0] : product.thumbnail,
                price: unitPrice,
                quantity: item.quantity,
                total: itemTotal,
                color: item.color || '',
                size: item.size || '',
                originalPrice,
                discountPercent: discountPercentOf(originalPrice, unitPrice),
                priceOverridden,
                sku: String(variant?.sku || '').trim() || String(product.sku || '').trim(),
            });
        }

        // One fulfillment package per order (single-store: every item ships together).
        // Its subtotal is the sum of the lines as charged (staff prices included): the
        // courier's COD amount is built from it (codFor in courier.service.ts).
        const packages = [{
            itemIds: orderItems.map((oi) => oi._id),
            status: 'pending',
            subtotal: round2(orderItems.reduce((sum, oi) => sum + oi.total, 0)),
            timeline: [{ status: 'pending', note: 'Order placed' }],
        }];

        // Apply coupon (percentage / fixed / free_shipping)
        let discount = 0;
        let couponFreeShipping = false;
        let appliedCoupon: any = null;
        if (couponCode) {
            const coupon: any = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
            const now = new Date();

            const applicableTo = coupon?.applicableTo || 'all';
            const eligibleBase = couponEligibleBase(coupon, subtotal, stagedItems);

            // How many times THIS customer has already redeemed (supports usagePerUser > 1).
            const userUses = (coupon?.usedBy || []).filter((id: any) => id.toString() === userId.toString()).length;
            const perUserLimit = coupon?.usagePerUser || 1;

            const usable = coupon && coupon.expiresAt > now
                && (!coupon.startDate || new Date(coupon.startDate) <= now)
                && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit)
                && subtotal >= (coupon.minOrderAmount || 0)
                && userUses < perUserLimit
                // Product/category coupons need at least one eligible item in the cart.
                && (coupon.discountType === 'free_shipping' || applicableTo === 'all' || eligibleBase > 0);

            if (usable) {
                appliedCoupon = coupon;
                ({ discount, freeShipping: couponFreeShipping } = couponValue(coupon, eligibleBase));
            }
        }

        // Authoritative server-side shipping charge (never trust a client-sent value).
        // Free shipping resolves via: all-items-free-delivery → coupon → subtotal
        // threshold → quantity → zone rate. Platform delivery fee is added to the
        // master order total only.
        // The one exception: on a dashboard order staff may waive the charge ('free') or
        // type it ('custom'); 'auto' runs the same rules as checkout.
        const shipping = override ? payload.shipping : undefined;
        const shippingMode: 'auto' | 'free' | 'custom' =
            shipping?.mode === 'free' || shipping?.mode === 'custom' ? shipping.mode : 'auto';
        let shippingCost: number;
        let freeReason: string | null = null;
        let zoneName = '';
        if (shippingMode === 'free') {
            shippingCost = 0;
            freeReason = 'admin';
        } else if (shippingMode === 'custom') {
            if (!isAmount(shipping.amount)) throw new AppError(400, 'Enter the delivery charge');
            shippingCost = round2(shipping.amount);
            if (shippingCost === 0) freeReason = 'admin';
        } else {
            const quote = await computeShippingCost({
                city: shippingAddress?.city || '',
                subtotal,
                items: stagedItems.map((s: any) => ({ freeShipping: Boolean(s.product?.shippingConfig?.freeShipping) })),
                totalQuantity: orderItems.reduce((n: number, oi: any) => n + (oi.quantity || 0), 0),
                couponFreeShipping,
                zoneId,
                area,
            });
            shippingCost = quote.shippingCost;
            freeReason = quote.freeReason;
            zoneName = quote.zoneName || '';
        }
        const total = Math.max(0, subtotal - discount) + shippingCost;

        // ── Reserve stock ATOMICALLY before creating the order. The earlier per-item
        //    stock check is not race-safe: two concurrent checkouts for the last unit
        //    would both pass it and both decrement, overselling into negative stock.
        //    A conditional decrement ({ stock: $gte qty }) is serialized by MongoDB, so
        //    each unit is sold at most once. On any shortfall we roll back what we already
        //    reserved and fail the whole order. ──
        const reserved: { product: any; variantId: unknown; quantity: number; balanceAfter: number; unitCost: number; color: string; size: string }[] = [];
        const rollbackReserved = async () => {
            for (const r of reserved) {
                const { update, options } = stockInc(r.quantity, r.variantId, { totalSold: -r.quantity });
                await Product.findByIdAndUpdate(r.product, update, options);
            }
        };
        for (const [idx, oi] of orderItems.entries()) {
            // orderItems were built from stagedItems in the same order.
            const variantId = matchVariant(stagedItems[idx]?.product?.variants, oi.color, oi.size)?._id || null;
            const { update, options } = stockInc(-oi.quantity, variantId, { totalSold: oi.quantity });
            const claimed = await Product.findOneAndUpdate(
                { _id: oi.product, isDeleted: false, status: 'active', stock: { $gte: oi.quantity } },
                update,
                options,
            );
            if (!claimed) {
                await rollbackReserved();
                throw new AppError(400, `Insufficient stock for "${oi.name}". Please review your cart and try again.`);
            }
            reserved.push({
                product: oi.product,
                variantId,
                quantity: oi.quantity,
                // For the stock ledger: `claimed` is the document from just before this atomic
                // decrement, so the balance after is exactly its stock minus the quantity.
                balanceAfter: Number((claimed as any).stock || 0) - oi.quantity,
                unitCost: Number((claimed as any).costPrice) || 0,
                color: oi.color,
                size: oi.size,
            });
        }

        // Create order (roll the reserved stock back if the order itself fails to persist).
        const orderData = {
            user: userId,
            items: orderItems,
            packages,
            shippingAddress,
            subtotal,
            shippingCost,
            shippingFreeReason: freeReason || '',
            shippingZone: zoneName || '',
            shippingMode,
            deliveryArea: area,
            discount,
            total,
            couponCode: appliedCoupon ? appliedCoupon.code : '',
            paymentMethod,
            paymentDetails: paymentDetails || {},
            transactionId: paymentDetails?.transactionId || '',
            note: note || '',
            timeline: [{ status: 'pending', note: 'Order placed successfully' }],
            source: opts.adminId ? 'admin' : 'storefront',
            createdBy: opts.adminId || undefined,
        };
        let order;
        try {
            try {
                order = await Order.create(orderData);
            } catch (err) {
                // The order number was already taken (a counter restored from an older
                // backup, say): move the counter past every number in use, try once more.
                if (!isDuplicateOrderId(err)) throw err;
                await resyncOrderCounter();
                order = await Order.create(orderData);
            }
        } catch (err) {
            await rollbackReserved();
            throw err;
        }

        // ── Stock ledger: one 'sale' row per reserved line. Logged only now that the order
        //    exists (a rolled-back reservation never appears); fire-and-forget. ──
        try {
            logStockMovements(reserved.map((r) => ({
                product: r.product,
                type: 'sale' as const,
                quantity: -r.quantity,
                balanceAfter: r.balanceAfter,
                variant: variantOf({ color: r.color, size: r.size }),
                unitCost: r.unitCost > 0 ? r.unitCost : null, // cost of goods at the time of sale
                note: `Order ${order.orderId || order._id}`,
                order: order._id,
                createdBy: opts.adminId || userId, // staff who took a dashboard order, else the customer
            })));
        } catch {
            // never block order flow
        }

        // Record coupon usage ATOMICALLY: enforce the global usage limit AND
        // one-use-per-customer in a single conditional update (no TOCTOU race).
        if (appliedCoupon) {
            const userObjId = new Types.ObjectId(userId);
            await Coupon.updateOne(
                {
                    _id: appliedCoupon._id,
                    $expr: {
                        $and: [
                            // Global usage limit (null = unlimited).
                            { $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }] },
                            // Per-user limit: count this customer's existing redemptions in usedBy.
                            {
                                $lt: [
                                    { $size: { $filter: { input: { $ifNull: ['$usedBy', []] }, as: 'u', cond: { $eq: ['$$u', userObjId] } } } },
                                    { $ifNull: ['$usagePerUser', 1] },
                                ],
                            },
                        ],
                    },
                },
                // Pipeline update → append the redemption (usedBy may repeat when usagePerUser > 1).
                [{
                    $set: {
                        usedCount: { $add: ['$usedCount', 1] },
                        usedBy: { $concatArrays: [{ $ifNull: ['$usedBy', []] }, [userObjId]] },
                    },
                }],
            );
        }

        // (Stock + totalSold were already decremented atomically during reservation above.)

        // Update user stats
        await User.findByIdAndUpdate(userId, { $inc: { totalOrders: 1, totalSpent: total } });

        // Send WhatsApp notification to admin (fire & forget)
        const user = await User.findById(userId);
        notifyOrderToWhatsApp({
            orderNumber: order.orderId || order._id.toString(),
            customerName: shippingAddress.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            customerPhone: shippingAddress.phone || user?.phone || '',
            address: shippingAddress.address || '',
            items: orderItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, color: i.color, size: i.size })),
            total,
            note: note || '',
        }).catch(() => {}); // never block order flow

        // Auto-send invoice email (fire & forget; lazy require avoids circular import)
        try {
            const { default: InvoiceService } = require('../invoice/invoice.service');
            InvoiceService.emailInvoiceToCustomer(order._id.toString()).catch(() => {});
        } catch {
            // never block order flow
        }

        // ── In-app notifications: fan-out (customer + all admins) ──
        // Fire-and-forget: any failure here must NEVER break order placement.
        try {
            const { NotificationService } = require('../notification/notification.service');
            const orderIdStr = order._id.toString();

            const fanOut = async () => {
                // 1) Customer — order placed confirmation
                await NotificationService.notify({
                    user: userId,
                    type: 'order_placed',
                    title: 'Order placed',
                    message: `Your order ${order.orderId || orderIdStr} has been placed successfully.`,
                    link: '/dashboard/user/orders/' + orderIdStr,
                    meta: { orderId: orderIdStr, total },
                });


                // 2) Every admin / superadmin
                const admins = await User.find({ role: { $in: ['admin', 'superadmin', 'editor'] } }).select('_id'); // editors confirm orders
                for (const admin of admins) {
                    await NotificationService.notify({
                        user: admin._id,
                        type: 'new_order',
                        title: 'New order placed',
                        message: `A new order ${order.orderId || orderIdStr} was placed (৳${total}).`,
                        link: '/dashboard/admin/orders/' + orderIdStr,
                        meta: { orderId: orderIdStr, total },
                    });
                }
            };

            fanOut().catch(() => {});
        } catch {
            // never block order flow
        }

        // ── Fraud check: flag the order when this customer returned an order before.
        //    Runs on the next tick, un-awaited, and never throws, so it can't block or slow
        //    checkout. Guest and admin-created orders come through here too. Lazy require
        //    avoids a circular import (fraud.service uses OrderService to cancel). ──
        setImmediate(() => {
            try {
                const { default: FraudService } = require('../fraud/fraud.service');
                FraudService.checkOrder(order, { notify: true }).catch(() => {});
            } catch {
                // never block order flow
            }
        });

        return order;
    },

    // ── Guest checkout: auto-create user + place order ────────────────
    async createGuestOrder(payload: any) {
        const { shippingAddress, password } = payload;
        const { fullName, email, phone } = shippingAddress;

        if (!phone || !fullName) {
            throw new AppError(400, 'Full name and phone number are required for checkout');
        }

        // Auto-generate guest email from phone if not provided
        const guestEmail = email || `${phone.replace(/\s+/g, '')}@guest.shohozkitchen.com`;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email: guestEmail.toLowerCase() }, { phone }] });
        let isNewUser = false;

        if (!user) {
            // Auto-create a guest account.
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || 'Customer';
            const lastName = nameParts.slice(1).join(' ') || '.';

            // Never use the email/phone as the password (guessable → account takeover).
            // Generate a strong random one. The guest is auto-logged-in via the token
            // returned below, and can recover later via "forgot password" or just track
            // their order (no login needed) at /track.
            const guestPassword = password || crypto.randomBytes(24).toString('hex');

            user = await User.create({
                email: guestEmail.toLowerCase(),
                password: guestPassword,
                firstName,
                lastName,
                phone,
                role: 'user',
                status: 'active',
                isEmailVerified: false,
            });
            isNewUser = true;
        }

        // Now create order using the existing createOrder method
        const order = await this.createOrder(user._id!.toString(), payload);

        // Generate token for auto-login
        const jwt = require('jsonwebtoken');
        const appConfig = require('../../config').default;
        const accessToken = jwt.sign(
            { userId: user._id!.toString(), email: user.email, role: user.role },
            appConfig.jwt.access_secret,
            { expiresIn: appConfig.jwt.access_expires_in }
        );

        return {
            order,
            user: {
                _id: user._id!.toString(),
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                phone: user.phone,
            },
            accessToken,
            isNewUser,
        };
    },

    // ── Admin "New order": a phone / walk-in order keyed by the customer's phone ──
    // Reuses the buyer if that phone is already on file, otherwise creates one with a
    // placeholder email and a random password (no token is issued — the admin is the
    // one placing it). Pricing, shipping, stock and coupons then run through the same
    // createOrder path as the storefront, except that staff may set each line's price
    // and the delivery charge.
    // A starting status / payment other than pending goes through the very
    // updateOrderStatus / updatePaymentStatus the order page uses, so every side effect
    // (timeline, packages, activity log, notifications) is the same. If one of those
    // fails the order still stands; `warnings` says what is left to do by hand.
    async createAdminOrder(payload: CreateAdminOrderPayload, adminId: string): Promise<{ order: any; warnings: string[] }> {
        const { fullName, email } = payload.shippingAddress || ({} as CreateAdminOrderPayload['shippingAddress']);
        if (!payload.shippingAddress?.phone || !String(fullName || '').trim()) {
            throw new AppError(400, 'Customer name and phone number are required');
        }

        // One form for every way a number gets typed ("+880 1712-345678" → "01712345678"),
        // so a customer already on file is found instead of getting a second account.
        const phone = normalizePhone(payload.shippingAddress.phone);
        if (!/^01\d{9}$/.test(phone)) {
            throw new AppError(400, 'Enter a valid 11-digit mobile number (01XXXXXXXXX)');
        }

        // A customer account wins; a number that only a staff account uses is refused.
        const matches = await findUsersByPhone(phone);
        let user: any = matches.find((u: any) => u.role === 'user' && u.phone === phone)
            || matches.find((u: any) => u.role === 'user')
            || null;
        if (!user && matches.length) {
            throw new AppError(400, 'This phone number belongs to a staff account, not a customer');
        }

        if (!user) {
            const placeholder = (String(email || '').trim() || `${phone}@guest.shohozkitchen.com`).toLowerCase();
            if (await User.exists({ email: placeholder })) {
                throw new AppError(409, 'A customer already uses this email — search for them by that email instead');
            }
            const nameParts = String(fullName).trim().split(/\s+/);
            user = await User.create({
                email: placeholder,
                password: crypto.randomBytes(24).toString('hex'),
                firstName: nameParts[0] || 'Customer',
                lastName: nameParts.slice(1).join(' '),
                phone,
                role: 'user',
                status: 'active',
                isEmailVerified: false,
            });
        } else if (user.status === 'blocked') {
            throw new AppError(400, 'This customer is blocked — unblock them before taking an order');
        }

        const order: any = await this.createOrder(
            user._id!.toString(),
            {
                ...payload,
                shippingAddress: { ...payload.shippingAddress, phone },
                paymentMethod: payload.paymentMethod || 'cod',
            },
            { allowPriceOverride: true, adminId },
        );

        const id = order._id.toString();
        const reason = (err: any) => String(err?.message || 'unknown error');
        const warnings: string[] = [];
        let latest: any = order;

        if (payload.status === 'confirmed' || payload.status === 'processing') {
            const label = payload.status === 'confirmed' ? 'Confirmed' : 'Processing';
            try {
                latest = await this.updateOrderStatus(id, payload.status, undefined, adminId);
            } catch (err) {
                warnings.push(`It could not be marked ${label} (${reason(err)}), so it is still Pending. Change the status on the order page.`);
            }
        }
        if (payload.paymentStatus === 'paid') {
            try {
                latest = await this.updatePaymentStatus(id, 'paid');
            } catch (err) {
                warnings.push(`The payment could not be marked paid (${reason(err)}). Mark it paid on the order page.`);
            }
        }

        return { order: latest, warnings };
    },

    /**
     * Edit an order that has not gone anywhere yet: who it is for, where it is going, how it
     * is being paid and what is on it. Only the parts staff changed arrive — everything left
     * out keeps exactly the value it had.
     *
     * The lines are the delicate part. `payload.items` replaces them wholesale, so what has
     * to move in stock is the difference between the lines the order held and the ones it
     * will hold. Extra units are claimed with the same conditional decrement checkout uses,
     * so an edit can never oversell; units the edit gives up go back only once the order has
     * actually been saved, so a failure half-way through leaves stock untouched.
     *
     * The order stays with the customer account it was placed against even when the phone
     * number on it is corrected: moving an order between two customers would rewrite both
     * their histories, which is more than a typo fix should do.
     */
    async updateOrderDetails(id: string, payload: UpdateAdminOrderPayload, actorId?: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        const blocked = editBlockedReason(order);
        if (blocked) throw new AppError(409, blocked);

        const editsItems = Array.isArray(payload.items);
        if (editsItems && (order.packages || []).length > 1) {
            throw new AppError(409, 'This order ships as more than one package, so its lines cannot be edited here.');
        }

        const asPlain = (v: any) => (typeof v?.toObject === 'function' ? v.toObject() : { ...(v || {}) });
        const oldItems: any[] = (order.items || []).map(asPlain);
        const changed: string[] = [];

        // ── Who the order is for, and where it goes ──
        const currentAddress = asPlain(order.shippingAddress);
        let shippingAddress = currentAddress;
        if (payload.shippingAddress) {
            const next = payload.shippingAddress;
            if (!String(next.fullName || '').trim()) throw new AppError(400, 'Customer name is required');
            // The same normalisation the dashboard's new-order form uses, so a number typed
            // as "+880 1712-345678" is stored the one way everything else searches for.
            const phone = normalizePhone(next.phone);
            if (!/^01\d{9}$/.test(phone)) {
                throw new AppError(400, 'Enter a valid 11-digit mobile number (01XXXXXXXXX)');
            }
            shippingAddress = { ...currentAddress, ...next, phone };
            const fields = ['fullName', 'phone', 'email', 'address', 'area', 'city', 'postalCode'] as const;
            if (fields.some((f) => String(shippingAddress[f] ?? '') !== String(currentAddress[f] ?? ''))) {
                changed.push('customer details');
            }
        }

        // ── The lines, and the stock they move ──
        const staged: { product: any; variant: any; item: any; unitPrice: number; originalPrice: number; priceOverridden: boolean; itemTotal: number }[] = [];
        let newItems: any[] = oldItems;
        let moves: any[] = [];
        // Units claimed for this edit; handed back if anything later in the edit fails.
        const reserved: { product: unknown; variantId: unknown; quantity: number; balanceAfter: number; unitCost: number; color: string; size: string }[] = [];
        const rollbackReserved = async () => {
            for (const r of reserved) {
                const { update, options } = stockInc(r.quantity, r.variantId, { totalSold: -r.quantity });
                await Product.findByIdAndUpdate(r.product, update, options);
            }
        };

        if (editsItems) {
            const existingByKey = new Map<string, any>(oldItems.map((it) => [lineKey(it.product, it.color, it.size), it]));
            const seen = new Set<string>();

            for (const item of payload.items!) {
                const key = lineKey(item.product, item.color, item.size);
                if (seen.has(key)) {
                    throw new AppError(400, 'The same product and option is on two lines — put it on one line with the full quantity.');
                }
                seen.add(key);

                const existing = existingByKey.get(key);
                // A product that has since been drafted may stay on the order it is already
                // on; only a line being ADDED now has to be one the shop still sells.
                const filter: Record<string, unknown> = { _id: item.product, isDeleted: false };
                if (!existing) filter.status = 'active';
                const product = await Product.findOne(filter);
                if (!product) throw new AppError(404, 'That product is no longer on sale, so it cannot be added to this order.');

                const variant = matchVariant(product.variants, item.color, item.size);
                const catalogPrice = catalogUnitPrice(product, variant);
                // A line staff did not re-price keeps what it was sold at. Reading today's
                // catalogue here would silently re-price an old order because the shop has
                // changed a price since it was placed.
                const unitPrice = isAmount(item.unitPrice)
                    ? round2(item.unitPrice)
                    : (existing ? Number(existing.price) || 0 : catalogPrice);
                const listFallback = existing && Number(existing.originalPrice) > 0
                    ? Number(existing.originalPrice)
                    : Math.max(catalogListPrice(product, variant, catalogPrice), unitPrice);
                const originalPrice = isAmount(item.originalPrice) ? round2(item.originalPrice) : listFallback;

                staged.push({
                    product,
                    variant,
                    item,
                    unitPrice,
                    originalPrice,
                    // "Custom price" means exactly this: the line is not at the shop's price.
                    priceOverridden: round2(unitPrice) !== round2(catalogPrice),
                    itemTotal: round2(unitPrice * item.quantity),
                });
            }

            newItems = staged.map((s) => {
                const existing = existingByKey.get(lineKey(s.item.product, s.item.color, s.item.size));
                return {
                    // Keeping a line's _id keeps the package's itemIds and its history pointing
                    // at the same line; only a line that is new to the order gets a new one.
                    _id: existing?._id || new Types.ObjectId(),
                    product: s.product._id,
                    // A line already on the order keeps the name and picture it was sold under,
                    // even if the product has been renamed since.
                    name: existing?.name || s.product.name,
                    thumbnail: existing?.thumbnail || (s.variant?.images?.length ? s.variant.images[0] : s.product.thumbnail),
                    price: s.unitPrice,
                    quantity: s.item.quantity,
                    total: s.itemTotal,
                    color: s.item.color || '',
                    size: s.item.size || '',
                    originalPrice: s.originalPrice,
                    discountPercent: discountPercentOf(s.originalPrice, s.unitPrice),
                    priceOverridden: s.priceOverridden,
                    sku: String(s.variant?.sku || '').trim() || String(s.product.sku || '').trim(),
                };
            });

            // What stock has to move: the new quantity less the old one, per line.
            const counts = new Map<string, any>();
            const tally = (it: any, field: 'before' | 'after', onOrder: boolean) => {
                const key = lineKey(it.product, it.color, it.size);
                const row = counts.get(key)
                    || { product: it.product, color: it.color || '', size: it.size || '', name: it.name || '', before: 0, after: 0, onOrder: false };
                row[field] += Number(it.quantity) || 0;
                row.onOrder = row.onOrder || onOrder;
                if (!row.name && it.name) row.name = it.name;
                counts.set(key, row);
            };
            for (const it of oldItems) tally(it, 'before', true);
            for (const it of newItems) tally(it, 'after', false);

            moves = [...counts.values()]
                .map((r) => ({ ...r, delta: r.after - r.before }))
                .filter((r) => r.delta !== 0);
            for (const m of moves) m.variantId = await lineVariantId(m);

            // Claim the extra units first, the same conditional decrement checkout uses: two
            // people editing towards the last unit cannot both get it.
            for (const m of moves.filter((x) => x.delta > 0)) {
                const { update, options } = stockInc(-m.delta, m.variantId, { totalSold: m.delta });
                const filter: Record<string, unknown> = { _id: m.product, isDeleted: false, stock: { $gte: m.delta } };
                if (!m.onOrder) filter.status = 'active';
                const claimed: any = await Product.findOneAndUpdate(filter, update, options);
                if (!claimed) {
                    await rollbackReserved();
                    throw new AppError(400, `There is not enough stock for "${m.name}".`);
                }
                reserved.push({
                    product: m.product,
                    variantId: m.variantId,
                    quantity: m.delta,
                    // `claimed` is the product as it was just before the decrement.
                    balanceAfter: (Number(claimed.stock) || 0) - m.delta,
                    unitCost: Number(claimed.costPrice) || 0,
                    color: m.color,
                    size: m.size,
                });
            }
            if (moves.length) changed.push('items');
        }

        // ── What it comes to ──
        const subtotal = round2(newItems.reduce((sum: number, it: any) => sum + (Number(it.total) || 0), 0));

        // The coupon was redeemed when the order was placed, so it is only re-priced here —
        // never re-checked against its limits, and never counted as a second redemption.
        let discount = Number(order.discount) || 0;
        const coupon: any = order.couponCode
            ? await Coupon.findOne({ code: String(order.couponCode).toUpperCase() })
            : null;
        let couponFreeShipping = coupon?.discountType === 'free_shipping';
        if (editsItems) {
            if (coupon) {
                ({ discount, freeShipping: couponFreeShipping } = couponValue(coupon, couponEligibleBase(coupon, subtotal, staged)));
            } else {
                // No coupon on file for the code: keep the amount, but never above the subtotal.
                discount = Math.min(discount, subtotal);
            }
        }

        const area = isDeliveryArea(payload.deliveryArea)
            ? payload.deliveryArea
            : (isDeliveryArea(order.deliveryArea) ? order.deliveryArea : undefined);
        const mode: 'auto' | 'free' | 'custom' = payload.shipping?.mode || (order.shippingMode as any) || 'auto';
        let shippingCost: number;
        let freeReason: string | null = null;
        let zoneName = order.shippingZone || '';
        if (mode === 'free') {
            shippingCost = 0;
            freeReason = 'admin';
        } else if (mode === 'custom') {
            const amount = payload.shipping?.amount ?? Number(order.shippingCost);
            if (!isAmount(amount)) throw new AppError(400, 'Enter the delivery charge');
            shippingCost = round2(amount);
            if (shippingCost === 0) freeReason = 'admin';
        } else {
            const quote = await computeShippingCost({
                city: shippingAddress?.city || '',
                subtotal,
                items: await freeShippingFlags(newItems, staged),
                totalQuantity: newItems.reduce((n: number, it: any) => n + (Number(it.quantity) || 0), 0),
                couponFreeShipping,
                zoneId: payload.zoneId,
                area,
            });
            shippingCost = quote.shippingCost;
            freeReason = quote.freeReason;
            zoneName = quote.zoneName || '';
        }
        const total = round2(Math.max(0, subtotal - discount) + shippingCost);
        if (round2(Number(order.shippingCost) || 0) !== shippingCost || (order.shippingMode || 'auto') !== mode) {
            changed.push('delivery charge');
        }

        // ── How it is paid ──
        const paymentMethod = payload.paymentMethod || order.paymentMethod;
        const currentPayment = asPlain(order.paymentDetails);
        // Cash on delivery carries no reference of its own: switching to it drops what the
        // previous method had recorded, so no stale transaction id survives on the invoice.
        const paymentDetails = paymentMethod === 'cod'
            ? { senderNumber: '', transactionId: '', paymentTime: '' }
            : { ...currentPayment, ...(payload.paymentDetails || {}) };
        if (paymentMethod !== order.paymentMethod
            || JSON.stringify(paymentDetails) !== JSON.stringify({ senderNumber: '', transactionId: '', paymentTime: '', ...currentPayment })) {
            changed.push('payment');
        }
        if (payload.note !== undefined && payload.note !== (order.note || '')) changed.push('note');

        // ── Save it, and only then let go of the stock this edit gave up ──
        const actor = actorId ? await User.findById(actorId).select('firstName lastName email').lean() : null;
        const actorName = actor
            ? [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() || actor.email || ''
            : '';

        const set: Record<string, unknown> = {
            shippingAddress,
            subtotal,
            shippingCost,
            shippingFreeReason: freeReason || '',
            shippingZone: zoneName || '',
            shippingMode: mode,
            discount: round2(discount),
            total,
            paymentMethod,
            paymentDetails,
            transactionId: paymentDetails.transactionId || '',
        };
        if (area) set.deliveryArea = area;
        if (payload.note !== undefined) set.note = payload.note;
        if (editsItems) {
            set.items = newItems;
            // The package's lines and its subtotal follow the order's: the courier's COD
            // amount is built from them.
            set.packages = (order.packages || []).map((p: any, idx: number) => {
                const pkg = asPlain(p);
                if (idx === 0) {
                    pkg.itemIds = newItems.map((it) => it._id);
                    pkg.subtotal = subtotal;
                }
                return pkg;
            });
        }

        // Guarded on the version the edit was computed from: a second save of the same form,
        // or another editor saving first, is refused instead of moving the stock twice.
        const version = (order as any).__v;
        const saved = await Order.updateOne(
            { _id: order._id, __v: version },
            {
                $set: set,
                $inc: { __v: 1 },
                $push: {
                    timeline: {
                        status: 'order_edited',
                        note: changed.length ? `Edited: ${changed.join(', ')}` : 'Edited',
                        actor: actorId || null,
                        actorName,
                        createdAt: new Date(),
                    },
                },
            },
        );
        if (saved.matchedCount === 0) {
            await rollbackReserved();
            throw new AppError(409, 'Someone changed this order while you were editing it. Reopen it and make the change again.');
        }

        // Units this edit gave up go back now that the order itself is definitely saved.
        const released: { product: unknown; quantity: number; balanceAfter: number; unitCost: number; color: string; size: string }[] = [];
        for (const m of moves.filter((x) => x.delta < 0)) {
            const give = -m.delta;
            const { update, options } = stockInc(give, m.variantId, { totalSold: -give });
            const after: any = await Product.findByIdAndUpdate(m.product, update, { ...options, new: true })
                .select('stock costPrice')
                .lean();
            released.push({
                product: m.product,
                quantity: give,
                balanceAfter: Number(after?.stock) || 0,
                unitCost: Number(after?.costPrice) || 0,
                color: m.color,
                size: m.size,
            });
        }

        const ledgerNote = `Order ${order.orderId || order._id} edited`;
        logMovements([
            ...reserved.map((r) => ({
                product: r.product as any,
                type: 'sale' as const,
                quantity: -r.quantity,
                balanceAfter: r.balanceAfter,
                variant: variantOf(r),
                unitCost: r.unitCost > 0 ? r.unitCost : null,
                note: ledgerNote,
                order: order._id,
                createdBy: actorId || null,
            })),
            ...released.map((r) => ({
                product: r.product as any,
                type: 'adjustment' as const,
                quantity: r.quantity,
                balanceAfter: r.balanceAfter,
                variant: variantOf(r),
                unitCost: r.unitCost > 0 ? r.unitCost : null,
                note: ledgerNote,
                order: order._id,
                createdBy: actorId || null,
            })),
        ]);

        // The customer's lifetime spend follows the order's new total.
        const spendDelta = round2(total - (Number(order.total) || 0));
        if (spendDelta !== 0) {
            await User.findByIdAndUpdate(order.user, { $inc: { totalSpent: spendDelta } });
        }

        return this.getOrderById(order._id.toString());
    },

    // actorId (optional) → the admin shown as "by" on the stock ledger when a cancel restocks.
    // guard (optional) → extra conditions the order must still meet when the change is
    // claimed (Fraud check passes "still cancellable and not booked with the courier").
    async updateOrderStatus(id: string, status: string, note?: string, actorId?: string, guard?: Record<string, unknown>) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        const prevOrderStatus = order.status;
        // Cancelling a still-active order puts its stock back, which must happen once only.
        const restock = status === 'cancelled' && !['cancelled', 'returned', 'refunded'].includes(prevOrderStatus);

        // Claim the change atomically first: it only goes through while the order still has
        // the status read above (and meets the guard). If another admin, the customer or a
        // courier booking changed it in the meantime, nothing happens and nothing is restocked twice.
        if (restock || guard) {
            const claimed = await Order.updateOne(
                { _id: order._id, status: prevOrderStatus, ...(guard ? { $and: [guard] } : {}) },
                { $set: { status } },
            );
            if (!claimed.matchedCount) {
                throw new AppError(409, 'This order was changed by someone else just now. Reload it and try again');
            }
        }

        // Who is making this change, for the staff activity report. Stays empty for
        // customer-driven and courier-driven updates, which pass no actorId.
        const actor = actorId
            ? await User.findById(actorId).select('firstName lastName email role').lean()
            : null;
        const actorName = actor
            ? [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() || actor.email || ''
            : '';

        order.status = status as any;
        order.timeline.push({ status, note: note || '', actor: actorId || null, actorName, createdAt: new Date() } as any);

        // Admin status drives all packages too (keeps the two views consistent)
        for (const pkg of (order as any).packages || []) {
            if (pkg.status === 'cancelled' || pkg.status === 'returned' || pkg.status === 'refunded') continue;
            pkg.status = status;
            pkg.timeline.push({ status, note: note || 'Updated by admin', actor: actorId || null, actorName, createdAt: new Date() });
        }

        // Update payment status when delivered
        if (status === 'delivered' && order.paymentMethod === 'cod') {
            order.paymentStatus = 'paid';
        }
        // Refund flips the payment status to refunded
        if (status === 'refunded') {
            order.paymentStatus = 'refunded';
        }

        try {
            await order.save();
        } catch (err) {
            // Undo the claim so the order is exactly as it was (nothing was restocked yet).
            if (restock || guard) {
                await Order.updateOne({ _id: order._id, status }, { $set: { status: prevOrderStatus } }).catch(() => {});
            }
            throw err;
        }

        // Restore product stock when an admin cancels a still-active order
        // (mirrors the user-cancel path so inventory is not silently lost). After the save,
        // like the user-cancel path, so a failed save can never leave stock restored twice.
        if (restock) {
            const ledger: (StockMovementInput | null)[] = [];
            for (const item of order.items) {
                const after = await restockLine(item);
                ledger.push(restockEntry(order, item, after, 'cancel', `Order ${order.orderId || order._id} cancelled`, actorId));
            }
            logMovements(ledger);
        }

        await closeFraudFlag(order._id, status, actorId);

        // ── Staff activity (fire-and-forget) — this is what the editor report counts ──
        if (actorId) {
            try {
                const { ActivityLogService } = require('../activityLog/activityLog.service');
                ActivityLogService.logActivity({
                    actor: actorId,
                    actorName,
                    action: `order_status_${status}`,
                    target: `Order:${order.orderId || order._id}`,
                    meta: {
                        orderId: order._id.toString(),
                        orderNo: order.orderId || '',
                        from: prevOrderStatus,
                        to: status,
                        role: actor?.role || '',
                        total: order.total ?? 0,
                    },
                }).catch(() => {});
            } catch {
                // never block a status update
            }
        }

        // ── Notify the customer of the status change (fire-and-forget) ──
        try {
            const { NotificationService } = require('../notification/notification.service');
            const orderIdStr = order._id.toString();
            NotificationService.notify({
                user: order.user.toString(),
                type: 'order_status',
                title: 'Order status updated',
                message: `Your order ${order.orderId || orderIdStr} is now "${status}".`,
                link: '/dashboard/user/orders/' + orderIdStr,
                meta: { orderId: orderIdStr, status },
            }).catch(() => {});
        } catch {
            // never block status update
        }

        return order;
    },

    // ── Courier-driven delivery (fully-automated status sync) ─────
    // Called by the Steadfast webhook / auto-sync when a package is reported
    // delivered. Runs the SAME money side-effects as an admin confirmation
    // (COD → paid + order-status recompute + customer
    // notify) so an automatic sync stays consistent with the manual path.
    // Idempotent and per-package; the CALLER saves the order.
    async applyCourierDelivered(order: any, pkg: any): Promise<boolean> {
        if (!pkg) return false;
        if (pkg.status === 'delivered') return false;                                  // already delivered
        if (['cancelled', 'returned', 'refunded'].includes(pkg.status)) return false;  // don't resurrect a closed package

        pkg.status = 'delivered';
        pkg.timeline.push({ status: 'delivered', note: 'Delivered — Steadfast auto-sync', createdAt: new Date() });
        // Recompute the order-level status from all its packages (multi-package safe).
        const newOrderStatus = computeOrderStatus((order as any).packages);
        if (order.status !== newOrderStatus) {
            order.status = newOrderStatus as any;
            order.timeline.push({ status: newOrderStatus, note: 'Auto-updated from courier', createdAt: new Date() });
        }
        // COD is collected on delivery → mark the order paid once fully delivered.
        if (order.status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') {
            order.paymentStatus = 'paid';
        }
        if (order.status === 'delivered') await closeFraudFlag(order._id, 'delivered');

        // Notify the customer (fire-and-forget — never block the sync).
        try {
            const { NotificationService } = require('../notification/notification.service');
            const orderIdStr = order._id.toString();
            NotificationService.notify({
                user: order.user.toString(),
                type: 'order_status',
                title: 'Order delivered',
                message: `Your order ${order.orderId || orderIdStr} has been delivered.`,
                link: '/dashboard/user/orders/' + orderIdStr,
                meta: { orderId: orderIdStr, status: 'delivered' },
            }).catch(() => {});
        } catch {
            // never block a status sync on notification failure
        }
        return true;
    },

    // ── Earnings helpers (idempotent via flags) ───────────────────
    // On delivered: move pending → HELD (10 working-day hold) + total, log ledger 'earning'.
    // Held earnings become available via releaseDueEarnings once the hold elapses.
    // Release earnings whose hold has elapsed: held → available, set pkg.earningsReleased.
    // Idempotent.
    // On reverse: if it was settled, pull back from (available if released, else held) + total,
    // log a 'reversal'; if still pending, just remove from pending.
    async cancelOrder(id: string, userId: string) {
        const order = await Order.findOne({ _id: id, user: userId });
        if (!order) throw new AppError(404, 'Order not found');
        if (!['pending', 'confirmed'].includes(order.status)) {
            throw new AppError(400, 'Order cannot be cancelled at this stage');
        }

        // Claim the cancel atomically, so a cancel by an admin at the same moment can't
        // restock the same items a second time.
        const prevStatus = order.status;
        const claimed = await Order.updateOne({ _id: order._id, status: prevStatus }, { $set: { status: 'cancelled' } });
        if (!claimed.matchedCount) throw new AppError(400, 'Order cannot be cancelled at this stage');

        order.status = 'cancelled';
        order.timeline.push({ status: 'cancelled', note: 'Cancelled by user', createdAt: new Date() } as any);

        // Cancel all packages
        for (const pkg of (order as any).packages || []) {
            if (pkg.status === 'cancelled' || pkg.status === 'returned') continue;
            pkg.status = 'cancelled';
            pkg.timeline.push({ status: 'cancelled', note: 'Cancelled by user', createdAt: new Date() });
        }

        try {
            await order.save();
        } catch (err) {
            await Order.updateOne({ _id: order._id, status: 'cancelled' }, { $set: { status: prevStatus } }).catch(() => {});
            throw err;
        }
        await closeFraudFlag(order._id, 'cancelled');

        // Restore stock
        const ledger: (StockMovementInput | null)[] = [];
        for (const item of order.items) {
            const after = await restockLine(item);
            ledger.push(restockEntry(order, item, after, 'cancel', `Order ${order.orderId || order._id} cancelled by the customer`, userId));
        }
        logMovements(ledger);

        return order;
    },

    async updatePaymentStatus(id: string, paymentStatus: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.paymentStatus = paymentStatus as any;
        if (paymentStatus === 'paid') {
            order.transactionId = order.transactionId || `PAY-${Date.now()}`;
        }
        order.timeline.push({ status: `payment_${paymentStatus}`, note: `Payment marked as ${paymentStatus}`, createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    async addAdminNote(id: string, note: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.timeline.push({ status: 'admin_note', note, createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    async getOrderStats() {
        const [total, pending, confirmed, processing, shipped, on_the_way, out_for_delivery, delivery_attempt, delivered, cancelled, returned, refunded] = await Promise.all([
            Order.countDocuments(),
            Order.countDocuments({ status: 'pending' }),
            Order.countDocuments({ status: 'confirmed' }),
            Order.countDocuments({ status: 'processing' }),
            Order.countDocuments({ status: 'shipped' }),
            Order.countDocuments({ status: 'on_the_way' }),
            Order.countDocuments({ status: 'out_for_delivery' }),
            Order.countDocuments({ status: 'delivery_attempt' }),
            Order.countDocuments({ status: 'delivered' }),
            Order.countDocuments({ status: 'cancelled' }),
            Order.countDocuments({ status: 'returned' }),
            Order.countDocuments({ status: 'refunded' }),
        ]);

        const revenueData = await Order.aggregate([
            { $match: { status: 'delivered' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } },
        ]);

        return { total, pending, confirmed, processing, shipped, on_the_way, out_for_delivery, delivery_attempt, delivered, cancelled, returned, refunded, totalRevenue: revenueData[0]?.totalRevenue || 0 };
    },

// ════════════════════════════════════════════════════════════
    //  RETURN / REFUND (called from the return module)
    // ════════════════════════════════════════════════════════════

    // Restore stock for the items in one package (used on return/refund — goods come back).
    async _restockPackage(order: any, pkg: any, ledgerNote?: string) {
        const ids = new Set((pkg.itemIds || []).map((x: any) => x.toString()));
        const ledger: (StockMovementInput | null)[] = [];
        for (const it of (order.items || [])) {
            if (ids.has(it._id.toString())) {
                const after = await restockLine(it);
                ledger.push(restockEntry(order, it, after, 'return', ledgerNote || `Order ${order.orderId || order._id} returned`));
            }
        }
        logMovements(ledger);
    },

    // Mark the order's package as returned, then recompute order status.
    async markPackageReturned(orderId: any, note?: string) {
        const order = await Order.findById(orderId);
        if (!order) throw new AppError(404, 'Order not found');

        const pkg = (order as any).packages?.[0];
        if (pkg && pkg.status !== 'returned' && pkg.status !== 'refunded') {
            pkg.status = 'returned';
            await this._restockPackage(order, pkg); // returned goods come back into stock
            pkg.timeline.push({ status: 'returned', note: note || 'Return approved', createdAt: new Date() });

            order.status = computeOrderStatus((order as any).packages) as any;
            order.timeline.push({ status: order.status, note: note || 'Package returned', createdAt: new Date() } as any);
            await order.save();
        }
        return order;
    },

    // Mark the order's package as refunded + flip payment status, then recompute order status.
    async markPackageRefunded(orderId: any, note?: string) {
        const order = await Order.findById(orderId);
        if (!order) throw new AppError(404, 'Order not found');

        order.paymentStatus = 'refunded';

        const pkg = (order as any).packages?.[0];
        if (pkg && pkg.status !== 'refunded') {
            const prev = pkg.status;

            // Restock ONLY if the goods weren't already returned-to-stock. The normal
            // return flow is approve → refund; markPackageReturned already restocked on
            // approve, so restocking again here would double-count inventory. A direct
            // refund (prev !== 'returned') still restocks.
            if (prev !== 'returned') await this._restockPackage(order, pkg, `Order ${order.orderId || order._id} refunded`);
            pkg.status = 'refunded';
            pkg.timeline.push({ status: 'refunded', note: note || 'Refund processed', createdAt: new Date() });
        }

        order.status = computeOrderStatus((order as any).packages) as any;
        order.timeline.push({ status: order.status, note: note || 'Refund processed', createdAt: new Date() } as any);
        await order.save();
        return order;
    },

    // ════════════════════════════════════════════════════════════
    //  TRACKING (admin set) + PUBLIC TRACK
    // ════════════════════════════════════════════════════════════

    // Admin sets the master order tracking number + carrier
    async updateOrderTracking(id: string, trackingNumber: string, carrier: string) {
        const order = await Order.findById(id);
        if (!order) throw new AppError(404, 'Order not found');

        order.trackingNumber = trackingNumber;
        order.carrier = carrier;
        order.timeline.push({
            status: 'tracking_updated',
            note: `Tracking: ${trackingNumber} via ${carrier}`,
            createdAt: new Date(),
        } as any);

        await order.save();
        return order;
    },

    // Public order tracking — matches human orderId (case-insensitive) OR Mongo _id.
    // Old orders are KM-xxxx and new ones SK-xxxx; their numbers never overlap (the
    // counter carried on from the highest KM number), so "SK-0033" or "km33" still
    // finds KM-0033.
    async trackOrder(orderId: string): Promise<any> {
        const escaped = orderId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const or: any[] = [{ orderId: new RegExp('^' + escaped + '$', 'i') }];
        if (Types.ObjectId.isValid(orderId)) or.push({ _id: orderId });

        let order = await Order.findOne({ $or: or });
        if (!order) {
            const parsed = parseOrderId(orderId);
            if (parsed && parsed.n > 0 && ORDER_ID_PREFIXES.includes(parsed.prefix)) {
                order = await Order.findOne({ orderId: { $in: ORDER_ID_PREFIXES.map((p) => formatOrderId(parsed.n, p)) } });
            }
        }
        if (!order) throw new AppError(404, 'Order not found');

        const o: any = order;
        const itemsCount = (o.items || []).reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
        const customerName = (o.shippingAddress?.fullName || '').trim().split(/\s+/)[0] || '';

        // This endpoint is PUBLIC (no auth). Only expose customer-facing lifecycle events —
        // NOT internal timeline entries like `admin_note` (which can hold private admin
        // comments) or `payment_*` markers (payment status is already returned separately).
        const PUBLIC_TIMELINE_STATUSES = new Set([
            'pending', 'confirmed', 'processing', 'shipped', 'on_the_way',
            'out_for_delivery', 'delivery_attempt', 'delivered', 'cancelled', 'returned', 'refunded',
        ]);

        return {
            orderId: o.orderId,
            status: o.status,
            paymentStatus: o.paymentStatus,
            paymentMethod: o.paymentMethod,
            createdAt: o.createdAt,
            customerName,
            itemsCount,
            timeline: (o.timeline || [])
                .filter((t: any) => PUBLIC_TIMELINE_STATUSES.has(t.status))
                .map((t: any) => ({ status: t.status, note: t.note, createdAt: t.createdAt })),
            packages: (o.packages || []).map((p: any) => ({
                status: p.status,
                trackingNumber: p.trackingNumber,
                carrier: p.carrier,
                timeline: (p.timeline || []).map((t: any) => ({ status: t.status, note: t.note, createdAt: t.createdAt })),
            })),
        };
    },
};

export default OrderService;

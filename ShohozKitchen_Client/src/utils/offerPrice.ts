/**
 * offerPrice — resolve the price to display for a product, respecting its
 * optional offer-validity window (offerStartDate / offerEndDate).
 *
 * An "offer" here means the discounted `price` (vs the higher `originalPrice`).
 * The offer is only honoured while it is within its validity window:
 *   - active  → show offer price + strikethrough original + discount %
 *   - expired / not yet started → show the regular (original) price, no discount
 *
 * SSR-safe: uses `new Date()` (no browser globals), so it produces the same
 * result on the server and on the client at render time.
 */

export interface OfferPriceProduct {
    price: number;
    originalPrice?: number | null;
    discount?: number | null;
    offerStartDate?: string | Date | null;
    offerEndDate?: string | Date | null;
}

export interface DisplayPrice {
    /** Price the customer pays right now. */
    currentPrice: number;
    /** Strikethrough "was" price — only set while the offer is active. */
    originalPrice?: number;
    /** Discount % — only non-zero while the offer is active. */
    discount: number;
    /** Whether the offer window is currently in effect. */
    offerActive: boolean;
    /** The configured offer end date (if any), for "valid till" messaging. */
    offerEndDate?: Date;
}

const toDate = (value?: string | Date | null): Date | undefined => {
    if (!value) return undefined;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
};

export function getDisplayPrice(product: OfferPriceProduct): DisplayPrice {
    const now = new Date();
    const start = toDate(product.offerStartDate);
    const end = toDate(product.offerEndDate);

    const afterStart = !start || now.getTime() >= start.getTime();
    const beforeEnd = !end || now.getTime() <= end.getTime();
    const offerActive = Boolean(end && afterStart && beforeEnd);

    const basePrice = Number(product.price) || 0;
    const hasOriginal = product.originalPrice !== null && product.originalPrice !== undefined && Number(product.originalPrice) > basePrice;
    const originalPrice = hasOriginal ? Number(product.originalPrice) : undefined;
    const calcDiscount = hasOriginal && originalPrice ? Math.round(((originalPrice - basePrice) / originalPrice) * 100) : 0;
    const discount = product.discount && Number(product.discount) > 0 ? Number(product.discount) : calcDiscount;

    return {
        currentPrice: basePrice,
        originalPrice: originalPrice,
        discount: discount,
        offerActive: offerActive,
        offerEndDate: end,
    };
}

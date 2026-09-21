/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Digital marketing: the tracking IDs a super admin sets under Digital marketing,
 * and the shop events sent to whichever of GTM, GA4, Meta Pixel and TikTok is on.
 *
 * The IDs are placed inside <script> tags on every storefront page. The server only
 * accepts them in these shapes (siteContent.validation.ts on the API); they are
 * checked again here and anything else is dropped rather than rendered.
 */

export const MARKETING_PATTERNS = {
    gtmId: /^GTM-[A-Z0-9]{4,12}$/,
    ga4Id: /^G-[A-Z0-9]{4,15}$/,
    metaPixelId: /^\d{8,20}$/,
    tiktokPixelId: /^[A-Z0-9]{10,32}$/,
    googleVerification: /^[A-Za-z0-9_-]{8,120}$/,
    bingVerification: /^[A-Za-z0-9_-]{8,120}$/,
    metaDomainVerification: /^[A-Za-z0-9_-]{8,120}$/,
} as const;

export type MarketingKey = keyof typeof MARKETING_PATTERNS;
export type MarketingIds = Partial<Record<MarketingKey, string>>;

/** Only the IDs that match their pattern; everything else is left out. */
export function cleanMarketingIds(raw: unknown): MarketingIds {
    const out: MarketingIds = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const key of Object.keys(MARKETING_PATTERNS) as MarketingKey[]) {
        const v = (raw as Record<string, unknown>)[key];
        if (typeof v === 'string' && MARKETING_PATTERNS[key].test(v.trim())) out[key] = v.trim();
    }
    return out;
}

/* ─── Events ──────────────────────────────────────────────────────────── */

const CURRENCY = 'BDT';

export interface TrackItem {
    id: string;
    name: string;
    price: number;
    quantity?: number;
    category?: string;
}

type EventName = 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase';

/** GA4 names are the source; Meta and TikTok use their own standard names. */
const META_EVENT: Record<EventName, string> = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    purchase: 'Purchase',
};
const TIKTOK_EVENT: Record<EventName, string> = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    purchase: 'CompletePayment',
};

const w = (): any => (typeof window === 'undefined' ? null : window);

/**
 * One shop event to every tracker that is on. Each call is guarded: a tracker that
 * is not configured (or blocked by an ad blocker) is skipped, and nothing here can
 * throw into the page that called it.
 */
function send(event: EventName, items: TrackItem[], value: number, extra: Record<string, unknown> = {}) {
    const win = w();
    if (!win) return;
    const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
    const gaItems = items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        price: round(i.price),
        quantity: i.quantity ?? 1,
        ...(i.category ? { item_category: i.category } : {}),
    }));
    const total = round(value);

    try {
        // GTM: GA4-style ecommerce on the data layer. Clear the previous object first,
        // as Google recommends, so fields from the last event cannot leak into this one.
        if (Array.isArray(win.dataLayer)) {
            win.dataLayer.push({ ecommerce: null });
            win.dataLayer.push({ event, ecommerce: { currency: CURRENCY, value: total, items: gaItems, ...extra } });
        }
        // GA4 loaded directly (not through GTM).
        if (typeof win.gtag === 'function') {
            win.gtag('event', event, { currency: CURRENCY, value: total, items: gaItems, ...extra });
        }
        // Meta Pixel.
        if (typeof win.fbq === 'function') {
            win.fbq('track', META_EVENT[event], {
                content_ids: items.map((i) => i.id),
                content_type: 'product',
                contents: items.map((i) => ({ id: i.id, quantity: i.quantity ?? 1 })),
                num_items: items.reduce((s, i) => s + (i.quantity ?? 1), 0),
                value: total,
                currency: CURRENCY,
            });
        }
        // TikTok Pixel.
        if (win.ttq && typeof win.ttq.track === 'function') {
            win.ttq.track(TIKTOK_EVENT[event], {
                contents: items.map((i) => ({ content_id: i.id, content_name: i.name, quantity: i.quantity ?? 1, price: round(i.price) })),
                content_type: 'product',
                value: total,
                currency: CURRENCY,
            });
        }
    } catch {
        // Tracking must never break shopping.
    }
}

export const trackViewItem = (item: TrackItem) => send('view_item', [item], item.price);

export const trackAddToCart = (item: TrackItem) => send('add_to_cart', [item], item.price * (item.quantity ?? 1));

export const trackBeginCheckout = (items: TrackItem[], value: number) => send('begin_checkout', items, value);

/**
 * An order was placed. Sent once per order even if the page re-renders or the
 * customer reloads it: the order number is remembered for the session.
 */
export function trackPurchase(order: { id: string; value: number; shipping?: number }, items: TrackItem[]) {
    const win = w();
    if (!win || !order.id) return;
    const key = `sk_tracked_purchase_${order.id}`;
    try {
        if (win.sessionStorage.getItem(key)) return;
        win.sessionStorage.setItem(key, '1');
    } catch {
        // No session storage (private mode): send anyway rather than never.
    }
    send('purchase', items, order.value, { transaction_id: order.id, ...(order.shipping ? { shipping: order.shipping } : {}) });
}

/**
 * A client-side page change. GA4 already follows browser history on its own, so
 * only GTM, Meta and TikTok are told here.
 */
export function trackPageView(path: string) {
    const win = w();
    if (!win) return;
    try {
        if (Array.isArray(win.dataLayer)) win.dataLayer.push({ event: 'page_view', page_path: path });
        if (typeof win.fbq === 'function') win.fbq('track', 'PageView');
        if (win.ttq && typeof win.ttq.page === 'function') win.ttq.page();
    } catch {
        // never break navigation
    }
}

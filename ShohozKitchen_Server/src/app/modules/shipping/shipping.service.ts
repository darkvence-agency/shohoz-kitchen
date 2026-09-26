import {
    ShippingZone, ShippingRate, ShippingSettings, IShippingSettings, DEFAULT_COD_CHARGE_BPS,
    DEFAULT_INSIDE_DHAKA_RATE, DEFAULT_OUTSIDE_DHAKA_RATE,
} from './shipping.model';

export type FreeReason = 'product' | 'coupon' | 'threshold' | 'quantity' | null;

/** One checked-out line's delivery settings (from Product.shippingConfig). */
export interface ShippingLine {
    freeShipping?: boolean;
    // The product's own charge per area; 0 = not set → the Settings rate applies.
    insideDhakaCost?: number;
    outsideDhakaCost?: number;
}

export interface ShippingQuoteInput {
    city?: string;
    subtotal?: number;
    // Per-item delivery settings (from Product.shippingConfig).
    items?: ShippingLine[];
    // Total item quantity in the cart/order (for quantity-based free shipping).
    totalQuantity?: number;
    // Resolved upstream from a free_shipping coupon.
    couponFreeShipping?: boolean;
    // Explicit zone chosen by the customer at checkout (deterministic — preferred
    // over fuzzy city matching). Empty/absent → fall back to city match / default.
    zoneId?: string;
    // Delivery area the customer picked at checkout. When set, the flat Inside /
    // Outside Dhaka charge from Settings applies (no guessing from the city text).
    area?: DeliveryArea;
}

export const DELIVERY_AREAS = ['inside_dhaka', 'outside_dhaka'] as const;
export type DeliveryArea = (typeof DELIVERY_AREAS)[number];
export const DELIVERY_AREA_LABEL: Record<DeliveryArea, string> = { inside_dhaka: 'Inside Dhaka', outside_dhaka: 'Outside Dhaka' };
export const isDeliveryArea = (v: unknown): v is DeliveryArea => DELIVERY_AREAS.includes(v as DeliveryArea);

export interface ShippingQuoteResult {
    shippingCost: number;
    estimatedDays: string;
    freeShipping: boolean;
    freeReason: FreeReason;
    // Name of the zone the rate came from (for display + order records).
    zoneName?: string;
    // What this cart costs in each area, so the cart and product pages can show
    // both numbers before the customer has picked one.
    areaRates: Record<DeliveryArea, number>;
}

// ── Settings singleton (admin-tunable; self-seeds defaults on first read) ──
export async function getSettings(): Promise<IShippingSettings> {
    // Upsert keeps a single 'main' doc and applies schema defaults on insert.
    return await ShippingSettings.findOneAndUpdate(
        { _key: 'main' },
        { $setOnInsert: { _key: 'main' } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
    ) as IShippingSettings;
}

export async function updateSettings(payload: Partial<IShippingSettings>): Promise<IShippingSettings> {
    const allowed: (keyof IShippingSettings)[] = [
        'freeShippingThreshold', 'freeShippingByThresholdEnabled',
        'defaultInsideDhakaRate', 'defaultOutsideDhakaRate', 'defaultEstimatedDays',
        'quantityFreeShippingEnabled', 'minItemsForFreeShipping',
        'codChargeBps',
    ];
    const $set: any = {};
    for (const k of allowed) if (payload[k] !== undefined) $set[k] = payload[k];
    return await ShippingSettings.findOneAndUpdate(
        { _key: 'main' },
        { $set, $setOnInsert: { _key: 'main' } },
        // runValidators: enforce the schema's codChargeBps range/integer rule too.
        { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
    ) as IShippingSettings;
}

/**
 * Current courier COD handling charge in basis points (100 = 1%). Read at booking
 * time and snapshotted onto the package, so later changes never touch booked parcels.
 */
export async function getCodChargeBps(): Promise<number> {
    const settings = await getSettings();
    const bps = Number(settings?.codChargeBps);
    return Number.isInteger(bps) && bps >= 0 ? bps : DEFAULT_COD_CHARGE_BPS;
}

/**
 * What an order costs to deliver to one area. Each line is charged its own
 * Inside/Outside Dhaka rate from the product (Settings' rate when it has none),
 * and the dearest line wins — an order pays one delivery charge, never a sum.
 * Free-delivery lines add nothing. No lines at all → the Settings rate.
 */
function areaCharge(lines: ShippingLine[] | undefined, area: DeliveryArea, insideRate: number, outsideRate: number): number {
    const settingsRate = area === 'inside_dhaka' ? insideRate : outsideRate;
    if (!Array.isArray(lines) || lines.length === 0) return settingsRate;
    return lines.reduce((dearest, line) => {
        if (line?.freeShipping) return dearest;
        const own = Number(area === 'inside_dhaka' ? line?.insideDhakaCost : line?.outsideDhakaCost) || 0;
        return Math.max(dearest, own > 0 ? own : settingsRate);
    }, 0);
}

/**
 * Authoritative, customer-facing shipping-cost computation. Never throws.
 *
 * Free-shipping resolution order (first match wins → cost 0):
 *   1. Product free delivery — EVERY checked-out item is free-delivery.
 *   2. Free-shipping coupon — couponFreeShipping passed in.
 *   3. Subtotal threshold — enabled AND subtotal >= threshold.
 *   4. Quantity threshold — enabled AND totalQuantity >= minItems.
 * Otherwise: zone match by city → rate.price (honoring the rate's
 * freeShippingMinimum); else the area charge above (product rate, or Settings').
 */
export async function computeShippingCost(
    { city, subtotal, items, totalQuantity, couponFreeShipping, zoneId, area }: ShippingQuoteInput,
): Promise<ShippingQuoteResult> {
    const sub = Number(subtotal) || 0;
    const cityStr = (city || '').toString().trim().toLowerCase();

    let settings: IShippingSettings | null = null;
    try {
        settings = await getSettings();
    } catch {
        settings = null; // fall back to hardcoded defaults below — never throw
    }
    const threshold = settings?.freeShippingThreshold ?? 5000;
    const thresholdEnabled = settings?.freeShippingByThresholdEnabled ?? true;
    const insideRate = settings?.defaultInsideDhakaRate ?? DEFAULT_INSIDE_DHAKA_RATE;
    const outsideRate = settings?.defaultOutsideDhakaRate ?? DEFAULT_OUTSIDE_DHAKA_RATE;
    const defaultDays = settings?.defaultEstimatedDays || '3-5 days';
    const qtyEnabled = settings?.quantityFreeShippingEnabled ?? false;
    const minItems = settings?.minItemsForFreeShipping ?? 0;

    const free = (reason: FreeReason): ShippingQuoteResult =>
        ({ shippingCost: 0, estimatedDays: defaultDays, freeShipping: true, freeReason: reason, areaRates: { inside_dhaka: 0, outside_dhaka: 0 } });
    // Both areas cost the same when a zone's rate decides the charge.
    const bothAreas = (cost: number): Record<DeliveryArea, number> => ({ inside_dhaka: cost, outside_dhaka: cost });

    // 1) Every item is free-delivery (per-order shipping → all-or-nothing).
    if (Array.isArray(items) && items.length > 0 && items.every((i) => i?.freeShipping === true)) {
        return free('product');
    }

    // 2) Free-shipping coupon.
    if (couponFreeShipping) return free('coupon');

    // 3) Subtotal threshold.
    if (thresholdEnabled && threshold > 0 && sub >= threshold) return free('threshold');

    // 4) Quantity threshold.
    if (qtyEnabled && minItems > 0 && Number(totalQuantity || 0) >= minItems) return free('quantity');

    // What this cart costs in each area, from the products' own charges.
    const areaRates: Record<DeliveryArea, number> = {
        inside_dhaka: areaCharge(items, 'inside_dhaka', insideRate, outsideRate),
        outside_dhaka: areaCharge(items, 'outside_dhaka', insideRate, outsideRate),
    };

    // 5a) Delivery area picked at checkout → that area's charge.
    if (isDeliveryArea(area)) {
        return {
            shippingCost: areaRates[area],
            estimatedDays: defaultDays,
            freeShipping: false,
            freeReason: null,
            zoneName: DELIVERY_AREA_LABEL[area],
            areaRates,
        };
    }

    // 5) Explicit zone selected at checkout (deterministic — no string guessing).
    if (zoneId) {
        try {
            const zone = await ShippingZone.findById(zoneId);
            if (zone && zone.isActive) {
                const rate = await ShippingRate.findOne({ zone: zone._id, isActive: true }).sort('price');
                if (rate && typeof rate.price === 'number') {
                    const rateFreeMin = (rate as any).freeShippingMinimum || 0;
                    if (rateFreeMin > 0 && sub >= rateFreeMin) {
                        return { shippingCost: 0, estimatedDays: rate.estimatedDays || defaultDays, freeShipping: true, freeReason: 'threshold', zoneName: zone.name, areaRates: bothAreas(0) };
                    }
                    return { shippingCost: rate.price, estimatedDays: rate.estimatedDays || defaultDays, freeShipping: false, freeReason: null, zoneName: zone.name, areaRates: bothAreas(rate.price) };
                }
            }
        } catch {
            // Invalid zoneId → fall through to city match / default flat rate.
        }
    }

    // 6) Zone match by city string (fallback when no zone was explicitly chosen).
    if (cityStr) {
        try {
            const zones = await ShippingZone.find({ isActive: true });
            const matchedZone = zones.find((z) => {
                const nameMatch = (z.name || '').toLowerCase().includes(cityStr)
                    || cityStr.includes((z.name || '').toLowerCase());
                const regionMatch = (z.regions || []).some((r) => {
                    const rl = (r || '').toLowerCase();
                    return rl && (rl.includes(cityStr) || cityStr.includes(rl));
                });
                return Boolean((z.name && nameMatch) || regionMatch);
            });

            if (matchedZone) {
                const rate = await ShippingRate.findOne({ zone: matchedZone._id, isActive: true }).sort('price');
                if (rate && typeof rate.price === 'number') {
                    const rateFreeMin = (rate as any).freeShippingMinimum || 0;
                    if (rateFreeMin > 0 && sub >= rateFreeMin) {
                        return { shippingCost: 0, estimatedDays: rate.estimatedDays || defaultDays, freeShipping: true, freeReason: 'threshold', areaRates: bothAreas(0) };
                    }
                    return {
                        shippingCost: rate.price,
                        estimatedDays: rate.estimatedDays || defaultDays,
                        freeShipping: false,
                        freeReason: null,
                        areaRates: bothAreas(rate.price),
                    };
                }
            }
        } catch {
            // Swallow DB errors → fall through to the default flat rate. Never throw.
        }
    }

    // 6) No area picked — guess it from the city text.
    const guessedArea: DeliveryArea = cityStr.includes('dhaka') ? 'inside_dhaka' : 'outside_dhaka';
    return {
        shippingCost: areaRates[guessedArea],
        estimatedDays: defaultDays,
        freeShipping: false,
        freeReason: null,
        areaRates,
    };
}

export default { computeShippingCost, getSettings, updateSettings, getCodChargeBps };

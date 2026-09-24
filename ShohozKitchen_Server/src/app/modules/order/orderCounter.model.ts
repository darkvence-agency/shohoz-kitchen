import { Schema, model } from 'mongoose';

/**
 * Hands out order numbers ({ _id: 'orderId', seq }) so a deleted order's number is
 * never reused and two orders placed at the same moment never get the same one.
 * Taking the next number (and seeding the counter) lives in order.model.ts, beside
 * the Order model it reads.
 */
const orderCounterSchema = new Schema(
    {
        _id: { type: String, required: true },
        seq: { type: Number, default: 0 },
    },
    { versionKey: false }
);

export const OrderCounter = model('OrderCounter', orderCounterSchema);

export const ORDER_COUNTER_ID = 'orderId';

/** New orders are SK-0001…; orders placed before the rename keep their KM- numbers. */
export const ORDER_ID_PREFIX = 'SK';
/** Every prefix an order ID can carry. The numbers never overlap between them. */
export const ORDER_ID_PREFIXES: readonly string[] = ['SK', 'KM'];

/** 50 → "SK-0050"; grows past four digits on its own (10000 → "SK-10000"). */
export const formatOrderId = (n: number, prefix: string = ORDER_ID_PREFIX) => `${prefix}-${String(n).padStart(4, '0')}`;

/**
 * "KM-0049" → { prefix: 'KM', n: 49 }, "sk 50" → { prefix: 'SK', n: 50 }; null when it
 * is not an order ID. One character class between the parts, and a length cap, so
 * text typed into the public tracking box can never make the pattern backtrack.
 */
export function parseOrderId(orderId: unknown): { prefix: string; n: number } | null {
    const s = String(orderId ?? '').trim();
    if (s.length > 32) return null;
    const m = /^([a-z]+)[\s-]*(\d{1,9})$/i.exec(s);
    return m ? { prefix: m[1].toUpperCase(), n: Number(m[2]) } : null;
}

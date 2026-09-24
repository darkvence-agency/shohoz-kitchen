import { Schema, model } from 'mongoose';
import { OrderCounter, ORDER_COUNTER_ID, formatOrderId, parseOrderId } from './orderCounter.model';

// `price` is the unit price actually charged and `total` = price × quantity.
// originalPrice / discountPercent / priceOverridden / sku came later: lines of older
// orders have none of them, and everything that reads a line treats a missing
// originalPrice as "no discount".
const orderItemSchema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    thumbnail: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    total: { type: Number, required: true },
    color: { type: String, default: '' },
    size: { type: String, default: '' },
    // List ("was") price per unit at order time, shown struck through when above `price`.
    originalPrice: { type: Number },
    // Whole percent off originalPrice; 0 when there is no discount.
    discountPercent: { type: Number },
    // True when staff typed this line's price on a dashboard order.
    priceOverridden: { type: Boolean, default: false },
    // SKU at order time: the variant's own SKU when it has one, else the product's.
    sku: { type: String },

}, { _id: true });

// `actor` is the staff member who made the change, or null when the customer,
// a courier webhook or an automatic sync did it. Entries written before this
// field existed have neither, so the staff report only covers changes from the
// day it was added onwards.
const timelineSchema = new Schema({
    status: { type: String },
    note: { type: String, default: '' },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
}, { _id: false });

// ── Package = the order's fulfillment unit (one shipment) ──
const packageSchema = new Schema({
    itemIds: [{ type: Schema.Types.ObjectId }],                         // refs to order.items[]._id in this package
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt', 'delivered', 'cancelled', 'returned', 'refunded'],
        default: 'pending',
    },
    subtotal: { type: Number, default: 0 },          // gross items total for this shipment
    trackingNumber: { type: String, default: '' },
    carrier: { type: String, default: '' },
    // ── Steadfast courier (auto booking + status sync) ──
    consignmentId: { type: String, default: '' },   // Steadfast consignment id
    courierStatus: { type: String, default: '' },    // raw Steadfast delivery_status
    courierBookedAt: { type: Date },
    // Set just before asking Steadfast to create the parcel, cleared once it answers
    // with a consignment. Still set means a send did not finish — a timeout can land
    // after Steadfast has already created the parcel — so the next send checks
    // Steadfast by invoice first instead of booking a second pickup.
    courierAttemptAt: { type: Date },
    // Courier COD handling charge (basis points, 100 = 1%) copied from shipping
    // settings when the parcel is booked, so a later rate change in Settings never
    // alters an already-booked parcel. Unset = booked before this snapshot existed.
    codChargeBps: { type: Number },
    timeline: { type: [timelineSchema], default: [] },
}, { _id: true });

const shippingAddressSchema = new Schema({
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    address: { type: String, required: true },
    area: { type: String, default: '' },
    city: { type: String, default: '' },
    postalCode: { type: String, default: '' },
}, { _id: false });

const orderSchema = new Schema(
    {
        orderId: { type: String, unique: true },
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        items: { type: [orderItemSchema], required: true },
        packages: { type: [packageSchema], default: [] }, // fulfillment shipments
        shippingAddress: { type: shippingAddressSchema, required: true },

        // Pricing
        subtotal: { type: Number, required: true },
        shippingCost: { type: Number, default: 0 },
        shippingFreeReason: { type: String, default: '' }, // '' | product | coupon | threshold | quantity | admin (waived by staff)
        shippingZone: { type: String, default: '' }, // name of the delivery zone the rate came from (if any)
        // How the delivery charge was set: 'auto' = the shipping rules; 'free' / 'custom' =
        // staff waived it or typed the amount on a dashboard order.
        shippingMode: { type: String, enum: ['auto', 'free', 'custom'], default: 'auto' },
        deliveryArea: { type: String }, // inside_dhaka | outside_dhaka, when one was picked
        discount: { type: Number, default: 0 },
        total: { type: Number, required: true },
        couponCode: { type: String, default: '' },

        // Status
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt', 'delivered', 'cancelled', 'returned', 'refunded'],
            default: 'pending',
        },
        cancelReason: { type: String, default: '' },
        paymentMethod: {
            type: String,
            enum: ['cod', 'bkash', 'rocket', 'nagad', 'bank', 'sslcommerz'],
            default: 'cod',
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending',
        },
        transactionId: { type: String, default: '' },
        paymentDetails: {
            senderNumber: { type: String, default: '' },
            transactionId: { type: String, default: '' },
            paymentTime: { type: String, default: '' },
        },
        trackingNumber: { type: String, default: '' },
        carrier: { type: String, default: '' },

        note: { type: String, default: '' },
        timeline: { type: [timelineSchema], default: [] },

        // Where the order came from. Orders placed before this field existed read as
        // 'storefront'; which of them staff took by phone can no longer be told.
        source: { type: String, enum: ['storefront', 'admin'], default: 'storefront' },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // the staff member, on 'admin' orders
    },
    { timestamps: true, toJSON: { virtuals: true } }
);

// Auto-generate the order ID (SK-0050 …) from the order counter.
orderSchema.pre('save', async function (next) {
    try {
        if (!this.orderId) this.orderId = await nextOrderId();
        next();
    } catch (err) {
        next(err as Error);
    }
});

orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model('Order', orderSchema);

/** The highest number any order ID carries, whatever its prefix (KM-0049 → 49); 0 when there are none. */
export async function highestOrderNumber(): Promise<number> {
    const rows = await Order.find({ orderId: { $regex: /^[A-Za-z]+-\d+$/ } }).select('orderId -_id').lean();
    let max = 0;
    for (const r of rows as { orderId?: string | null }[]) max = Math.max(max, parseOrderId(r.orderId)?.n || 0);
    return max;
}

/**
 * Raise the counter to the highest order number in use. $max never lowers it, so
 * callers racing here are harmless. Seeds a missing counter, and repairs one that fell
 * behind (see the duplicate-ID retry in OrderService.createOrder).
 */
export async function resyncOrderCounter(): Promise<void> {
    const highest = await highestOrderNumber();
    await OrderCounter.updateOne({ _id: ORDER_COUNTER_ID }, { $max: { seq: highest } }, { upsert: true });
}

/**
 * The next order ID. One atomic $inc, so simultaneous orders never share a number and
 * a deleted order's number is never handed out again. The first time (no counter yet)
 * it seeds from the existing orders first, so the live shop continues after KM-0049
 * with SK-0050.
 */
export async function nextOrderId(): Promise<string> {
    const bump = (upsert: boolean) =>
        OrderCounter.findOneAndUpdate({ _id: ORDER_COUNTER_ID }, { $inc: { seq: 1 } }, { upsert, new: true }).lean();
    let counter: any = await bump(false);
    if (!counter) {
        await resyncOrderCounter();
        counter = await bump(true);
    }
    return formatOrderId(Number(counter.seq));
}

import { z } from 'zod';

const orderItemValidation = z.object({
    product: z.string().min(1, 'Product ID required'),
    quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(10000, 'Quantity is too large'),
});

// Upper limits keep customer-typed text to a sane size (it is stored and pattern-matched later).
const shippingAddressValidation = z.object({
    fullName: z.string().min(1, 'Full name required').max(120, 'Full name is too long'),
    phone: z.string().min(1, 'Phone required').max(30, 'Phone number is too long'),
    email: z.string().max(254, 'Email is too long').optional(),
    address: z.string().min(1, 'Address required').max(500, 'Address is too long'),
    area: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
});

// A manual (bKash / Nagad / bank) payment: where the money came from, its reference and when.
const paymentDetailsValidation = z.object({
    senderNumber: z.string().max(80, 'Sender number / account is too long').optional(),
    transactionId: z.string().max(80, 'Transaction ID is too long').optional(),
    paymentTime: z.string().max(40, 'Payment time is too long').optional(),
}).optional();

export const createOrderValidation = z.object({
    body: z.object({
        items: z.array(orderItemValidation).min(1, 'At least one item required'),
        shippingAddress: shippingAddressValidation,
        paymentMethod: z.enum(['cod', 'bkash', 'rocket', 'nagad', 'bank', 'sslcommerz']).default('cod'),
        paymentDetails: paymentDetailsValidation,
        couponCode: z.string().optional(),
        note: z.string().optional(),
        // Delivery zone chosen from the checkout dropdown (deterministic rate).
        zoneId: z.string().optional(),
        // Inside / Outside Dhaka picked at checkout → the flat charge from Settings.
        deliveryArea: z.enum(['inside_dhaka', 'outside_dhaka']).optional(),
    }),
});

/**
 * Dashboard "New order" (POST /orders/admin) only. Staff may set each line's price for
 * this order, the delivery charge, and the payment / order status it starts in.
 * Customers never reach this schema: their checkout keeps createOrderValidation, and
 * the service ignores these fields unless the admin route asks it to honour them.
 */
const adminOrderItemValidation = orderItemValidation.extend({
    color: z.string().optional(),
    size: z.string().optional(),
    // Price charged per unit on THIS order; the product's own price is not changed.
    unitPrice: z.number().finite().min(0, 'Price cannot be negative').optional(),
    // List ("was") price per unit, shown struck through when above the charged price.
    originalPrice: z.number().finite().min(0, 'Price cannot be negative').optional(),
});

const adminShippingValidation = z
    .object({
        mode: z.enum(['auto', 'free', 'custom']),
        amount: z.number().finite().min(0, 'Delivery charge cannot be negative').optional(),
    })
    .refine((s) => s.mode !== 'custom' || s.amount !== undefined, {
        message: 'Enter the delivery charge',
        path: ['amount'],
    });

export const createAdminOrderBody = z.object({
    items: z.array(adminOrderItemValidation).min(1, 'At least one item required'),
    shippingAddress: shippingAddressValidation,
    paymentMethod: z.enum(['cod', 'bkash', 'nagad', 'rocket', 'bank']),
    paymentDetails: paymentDetailsValidation,
    paymentStatus: z.enum(['pending', 'paid']).default('pending'),
    status: z.enum(['pending', 'confirmed', 'processing']).default('pending'),
    deliveryArea: z.enum(['inside_dhaka', 'outside_dhaka']).optional(),
    zoneId: z.string().optional(),
    shipping: adminShippingValidation.default({ mode: 'auto' }),
    couponCode: z.string().optional(),
    note: z.string().optional(),
});

export const createAdminOrderValidation = z.object({ body: createAdminOrderBody });

export type CreateAdminOrderPayload = z.infer<typeof createAdminOrderBody>;

/**
 * Dashboard "Edit order" (PATCH /orders/admin/:id). Every group is optional, because the
 * form sends only what staff touched; each one that IS sent is checked exactly as the
 * create route checks it. Prices are accepted here for the same reason as on the create
 * route — a customer's own checkout never reaches this schema.
 *
 * Deliberately absent: `status` and `paymentStatus` keep their own endpoints (the order
 * status drives stock and the courier; the payment status stays with admins), and
 * `couponCode`, because a coupon's redemption was already counted when the order was
 * placed. Staff lower a line's price instead.
 */
const updateAdminOrderBody = z
    .object({
        items: z.array(adminOrderItemValidation).min(1, 'An order must keep at least one item').optional(),
        shippingAddress: shippingAddressValidation.optional(),
        paymentMethod: z.enum(['cod', 'bkash', 'nagad', 'rocket', 'bank']).optional(),
        paymentDetails: paymentDetailsValidation,
        deliveryArea: z.enum(['inside_dhaka', 'outside_dhaka']).optional(),
        zoneId: z.string().optional(),
        shipping: adminShippingValidation.optional(),
        note: z.string().max(2000, 'Note is too long').optional(),
    })
    .refine((body) => Object.values(body).some((v) => v !== undefined), {
        message: 'Nothing was changed',
    });

export const updateAdminOrderValidation = z.object({ body: updateAdminOrderBody });

export type UpdateAdminOrderPayload = z.infer<typeof updateAdminOrderBody>;

export const updateOrderStatusValidation = z.object({
    body: z.object({
        status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt', 'delivered', 'cancelled', 'returned', 'refunded']),
        note: z.string().optional(),
    }),
});

import { z } from 'zod';

const orderItemValidation = z.object({
    product: z.string().min(1, 'Product ID required'),
    quantity: z.number().int('Quantity must be a whole number').min(1, 'Quantity must be at least 1').max(10000, 'Quantity is too large'),
});

const shippingAddressValidation = z.object({
    fullName: z.string().min(1, 'Full name required'),
    phone: z.string().min(1, 'Phone required'),
    email: z.string().optional(),
    address: z.string().min(1, 'Address required'),
    area: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
});

const paymentDetailsValidation = z.object({
    senderNumber: z.string().optional(),
    transactionId: z.string().optional(),
    paymentTime: z.string().optional(),
}).optional();

export const createOrderValidation = z.object({
    body: z.object({
        items: z.array(orderItemValidation).min(1, 'At least one item required'),
        shippingAddress: shippingAddressValidation,
        paymentMethod: z.enum(['cod', 'bkash', 'rocket', 'nagad', 'sslcommerz']).default('bkash'),
        paymentDetails: paymentDetailsValidation,
        couponCode: z.string().optional(),
        note: z.string().optional(),
        // Delivery zone chosen from the checkout dropdown (deterministic rate).
        zoneId: z.string().optional(),
    }),
});

export const updateOrderStatusValidation = z.object({
    body: z.object({
        status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt', 'delivered', 'cancelled', 'returned', 'refunded']),
        note: z.string().optional(),
    }),
});

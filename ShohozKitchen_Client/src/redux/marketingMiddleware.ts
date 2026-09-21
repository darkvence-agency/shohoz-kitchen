import type { Middleware } from '@reduxjs/toolkit';
import { addToCart } from './slices/cartSlice';
import { trackAddToCart } from '@/lib/marketing';

/**
 * Every "Add to cart" in the shop — product page, product cards, wishlist, buy now —
 * goes through the one cart action, so the AddToCart event is sent from here rather
 * than from each button.
 */
export const marketingMiddleware: Middleware = () => (next) => (action) => {
    const result = next(action);
    if (addToCart.match(action)) {
        const p = action.payload;
        trackAddToCart({
            id: p.productId || p.id,
            name: p.name,
            price: Number(p.price) || 0,
            quantity: p.quantity ?? 1,
            category: p.category || undefined,
        });
    }
    return result;
};

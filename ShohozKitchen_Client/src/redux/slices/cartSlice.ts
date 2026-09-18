import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
    id: string;          // unique key: productId or productId_color_size
    productId: string;   // actual product _id
    name: string;
    price: number;
    mrp: number;
    image: string;
    category: string;
    quantity: number;
    color?: string;
    colorHex?: string;
    size?: string;
    variantId?: string;
    wholesalePrice?: number;
    discount?: number;
}

interface CartState {
    items: CartItem[];
    totalQuantity: number;
    totalPrice: number;
}

// Load cart from localStorage
const loadCartFromStorage = (): CartState => {
    if (typeof window === 'undefined') {
        return { items: [], totalQuantity: 0, totalPrice: 0 };
    }
    try {
        const stored = localStorage.getItem('shohozkitchen_cart');
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                items: parsed.items || [],
                totalQuantity: parsed.totalQuantity || 0,
                totalPrice: parsed.totalPrice || 0,
            };
        }
    } catch {}
    return { items: [], totalQuantity: 0, totalPrice: 0 };
};

// Save cart to localStorage
const saveCartToStorage = (state: CartState) => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem('shohozkitchen_cart', JSON.stringify({
                items: state.items,
                totalQuantity: state.totalQuantity,
                totalPrice: state.totalPrice,
            }));
        } catch {}
    }
};

// Always start empty for SSR — hydrate from localStorage on client mount
const initialState: CartState = {
    items: [],
    totalQuantity: 0,
    totalPrice: 0,
};

const calculateTotals = (items: CartItem[]) => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return { totalQuantity, totalPrice };
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        addToCart: (state, action: PayloadAction<Omit<CartItem, 'quantity'> & { quantity?: number }>) => {
            const existingItem = state.items.find(item => item.id === action.payload.id);
            const qty = action.payload.quantity ?? 1;

            if (existingItem) {
                existingItem.quantity += qty;
            } else {
                state.items.push({ ...action.payload, quantity: qty });
            }

            const totals = calculateTotals(state.items);
            state.totalQuantity = totals.totalQuantity;
            state.totalPrice = totals.totalPrice;
            saveCartToStorage(state);
        },

        removeFromCart: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item.id !== action.payload);

            const totals = calculateTotals(state.items);
            state.totalQuantity = totals.totalQuantity;
            state.totalPrice = totals.totalPrice;
            saveCartToStorage(state);
        },

        increaseQuantity: (state, action: PayloadAction<string>) => {
            const item = state.items.find(item => item.id === action.payload);
            if (item) {
                item.quantity += 1;
            }

            const totals = calculateTotals(state.items);
            state.totalQuantity = totals.totalQuantity;
            state.totalPrice = totals.totalPrice;
            saveCartToStorage(state);
        },

        decreaseQuantity: (state, action: PayloadAction<string>) => {
            const item = state.items.find(item => item.id === action.payload);
            if (item) {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    state.items = state.items.filter(i => i.id !== action.payload);
                }
            }

            const totals = calculateTotals(state.items);
            state.totalQuantity = totals.totalQuantity;
            state.totalPrice = totals.totalPrice;
            saveCartToStorage(state);
        },

        clearCart: (state) => {
            state.items = [];
            state.totalQuantity = 0;
            state.totalPrice = 0;
            saveCartToStorage(state);
        },

        updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
            const item = state.items.find(item => item.id === action.payload.id);
            if (item && action.payload.quantity > 0) {
                item.quantity = action.payload.quantity;
            }

            const totals = calculateTotals(state.items);
            state.totalQuantity = totals.totalQuantity;
            state.totalPrice = totals.totalPrice;
            saveCartToStorage(state);
        },

        // Change a line's variant (color / size) straight from the cart. The cart key
        // (id = productId[_color][_size]) is recomputed; if the same variant is already
        // in the cart the two lines are merged so we never get duplicate keys.
        updateCartItemVariant: (
            state,
            action: PayloadAction<{
                id: string;
                color?: string;
                colorHex?: string;
                size?: string;
                price?: number;
                mrp?: number;
                image?: string;
                variantId?: string;
                wholesalePrice?: number;
                discount?: number;
            }>
        ) => {
            const { id, color, colorHex, size, price, mrp, image, variantId, wholesalePrice, discount } = action.payload;
            const item = state.items.find(i => i.id === id);
            if (!item) return;

            // Rebuild the cart key the same way the product page does.
            const parts = [item.productId];
            if (color) parts.push(color);
            if (size) parts.push(size);
            const newId = parts.join('_');

            // Apply the chosen variant onto the line.
            item.color = color || undefined;
            item.colorHex = colorHex || undefined;
            item.size = size || undefined;
            if (typeof price === 'number') item.price = price;
            if (typeof mrp === 'number') item.mrp = mrp;
            if (typeof discount === 'number') item.discount = discount;
            if (typeof variantId === 'string' || variantId === undefined) item.variantId = variantId;
            if (typeof wholesalePrice === 'number') item.wholesalePrice = wholesalePrice;
            if (image) item.image = image;

            if (newId !== id) {
                // item.id is still the old key here, so this can only match a *different* line.
                const existing = state.items.find(i => i.id === newId);
                if (existing) {
                    existing.quantity += item.quantity;
                    state.items = state.items.filter(i => i.id !== id);
                } else {
                    item.id = newId;
                }
            }

            const totals = calculateTotals(state.items);
            state.totalQuantity = totals.totalQuantity;
            state.totalPrice = totals.totalPrice;
            saveCartToStorage(state);
        },

        // Load cart from localStorage (call on app mount)
        hydrateCart: (state) => {
            const stored = loadCartFromStorage();
            state.items = stored.items;
            state.totalQuantity = stored.totalQuantity;
            state.totalPrice = stored.totalPrice;
        },
    },
});

export const {
    addToCart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
    updateQuantity,
    updateCartItemVariant,
    hydrateCart
} = cartSlice.actions;

export default cartSlice.reducer;


import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WishlistItem {
    id: string;
    name: string;
    price: number;
    mrp: number;
    image: string;
    category: string;
    rating: number;
}

interface WishlistState {
    items: WishlistItem[];
    totalItems: number;
}

const STORAGE_KEY = 'sinortiglobal_wishlist';

const loadFromStorage = (): WishlistItem[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveToStorage = (items: WishlistItem[]) => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
};

const initialState: WishlistState = {
    items: [],
    totalItems: 0,
};

const wishlistSlice = createSlice({
    name: 'wishlist',
    initialState,
    reducers: {
        hydrateWishlist: (state) => {
            const saved = loadFromStorage();
            state.items = saved;
            state.totalItems = saved.length;
        },

        addToWishlist: (state, action: PayloadAction<WishlistItem>) => {
            const exists = state.items.find(item => item.id === action.payload.id);
            if (!exists) {
                state.items.push(action.payload);
                state.totalItems = state.items.length;
                saveToStorage(state.items);
            }
        },

        removeFromWishlist: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item.id !== action.payload);
            state.totalItems = state.items.length;
            saveToStorage(state.items);
        },

        toggleWishlist: (state, action: PayloadAction<WishlistItem>) => {
            const index = state.items.findIndex(item => item.id === action.payload.id);
            if (index !== -1) {
                state.items.splice(index, 1);
            } else {
                state.items.push(action.payload);
            }
            state.totalItems = state.items.length;
            saveToStorage(state.items);
        },

        clearWishlist: (state) => {
            state.items = [];
            state.totalItems = 0;
            saveToStorage([]);
        },
    },
});

export const {
    hydrateWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    clearWishlist,
} = wishlistSlice.actions;

export default wishlistSlice.reducer;

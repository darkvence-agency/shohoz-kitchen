import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CartItem } from './cartSlice';

// A saved item mirrors the cart item shape exactly.
export type SavedItem = CartItem;

interface SavedForLaterState {
    items: SavedItem[];
}

const STORAGE_KEY = 'shohozkitchen_saved';

// Load saved items from localStorage
const loadSavedFromStorage = (): SavedForLaterState => {
    if (typeof window === 'undefined') {
        return { items: [] };
    }
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { items: parsed.items || [] };
        }
    } catch {}
    return { items: [] };
};

// Save saved items to localStorage
const saveSavedToStorage = (state: SavedForLaterState) => {
    if (typeof window !== 'undefined') {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
        } catch {}
    }
};

// Always start empty for SSR — hydrate from localStorage on client mount
const initialState: SavedForLaterState = {
    items: [],
};

const savedForLaterSlice = createSlice({
    name: 'savedForLater',
    initialState,
    reducers: {
        saveForLater: (state, action: PayloadAction<SavedItem>) => {
            const existingItem = state.items.find(item => item.id === action.payload.id);
            if (!existingItem) {
                state.items.push(action.payload);
            }
            saveSavedToStorage(state);
        },

        removeFromSaved: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item.id !== action.payload);
            saveSavedToStorage(state);
        },

        clearSaved: (state) => {
            state.items = [];
            saveSavedToStorage(state);
        },

        // Load saved items from localStorage (call on mount)
        hydrateSaved: (state) => {
            const stored = loadSavedFromStorage();
            state.items = stored.items;
        },
    },
});

export const {
    saveForLater,
    removeFromSaved,
    clearSaved,
    hydrateSaved,
} = savedForLaterSlice.actions;

export default savedForLaterSlice.reducer;

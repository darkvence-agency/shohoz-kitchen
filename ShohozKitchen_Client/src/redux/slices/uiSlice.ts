import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
    // Mobile menu
    isMobileMenuOpen: boolean;

    // Modals
    isCartModalOpen: boolean;
    isSearchModalOpen: boolean;
    isQuickViewModalOpen: boolean;
    quickViewProductId: number | null;
    isAuthModalOpen: boolean;
    authModalType: 'login' | 'register' | 'forgot';

    // Loading states
    isGlobalLoading: boolean;

    // Notifications/Toast
    notification: {
        show: boolean;
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
    } | null;

    // Sidebar
    isFilterSidebarOpen: boolean;

    // Compare
    compareProducts: number[];
}

const initialState: UIState = {
    isMobileMenuOpen: false,
    isCartModalOpen: false,
    isSearchModalOpen: false,
    isQuickViewModalOpen: false,
    quickViewProductId: null,
    isAuthModalOpen: false,
    authModalType: 'login',
    isGlobalLoading: false,
    notification: null,
    isFilterSidebarOpen: false,
    compareProducts: [],
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleMobileMenu: (state) => {
            state.isMobileMenuOpen = !state.isMobileMenuOpen;
        },

        closeMobileMenu: (state) => {
            state.isMobileMenuOpen = false;
        },

        openCartModal: (state) => {
            state.isCartModalOpen = true;
        },

        closeCartModal: (state) => {
            state.isCartModalOpen = false;
        },

        toggleCartModal: (state) => {
            state.isCartModalOpen = !state.isCartModalOpen;
        },

        openSearchModal: (state) => {
            state.isSearchModalOpen = true;
        },

        closeSearchModal: (state) => {
            state.isSearchModalOpen = false;
        },

        openQuickView: (state, action: PayloadAction<number>) => {
            state.isQuickViewModalOpen = true;
            state.quickViewProductId = action.payload;
        },

        closeQuickView: (state) => {
            state.isQuickViewModalOpen = false;
            state.quickViewProductId = null;
        },

        openAuthModal: (state, action: PayloadAction<'login' | 'register' | 'forgot'>) => {
            state.isAuthModalOpen = true;
            state.authModalType = action.payload;
        },

        closeAuthModal: (state) => {
            state.isAuthModalOpen = false;
        },

        setGlobalLoading: (state, action: PayloadAction<boolean>) => {
            state.isGlobalLoading = action.payload;
        },

        showNotification: (state, action: PayloadAction<{ type: 'success' | 'error' | 'warning' | 'info'; message: string }>) => {
            state.notification = {
                show: true,
                type: action.payload.type,
                message: action.payload.message,
            };
        },

        hideNotification: (state) => {
            state.notification = null;
        },

        toggleFilterSidebar: (state) => {
            state.isFilterSidebarOpen = !state.isFilterSidebarOpen;
        },

        closeFilterSidebar: (state) => {
            state.isFilterSidebarOpen = false;
        },

        addToCompare: (state, action: PayloadAction<number>) => {
            if (state.compareProducts.length < 4 && !state.compareProducts.includes(action.payload)) {
                state.compareProducts.push(action.payload);
            }
        },

        removeFromCompare: (state, action: PayloadAction<number>) => {
            state.compareProducts = state.compareProducts.filter(id => id !== action.payload);
        },

        clearCompare: (state) => {
            state.compareProducts = [];
        },
    },
});

export const {
    toggleMobileMenu,
    closeMobileMenu,
    openCartModal,
    closeCartModal,
    toggleCartModal,
    openSearchModal,
    closeSearchModal,
    openQuickView,
    closeQuickView,
    openAuthModal,
    closeAuthModal,
    setGlobalLoading,
    showNotification,
    hideNotification,
    toggleFilterSidebar,
    closeFilterSidebar,
    addToCompare,
    removeFromCompare,
    clearCompare,
} = uiSlice.actions;

export default uiSlice.reducer;

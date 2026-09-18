import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Product {
    id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    mrp: number;
    category: string;
    categoryId: number;
    brand: string;
    image: string;
    images: string[];
    rating: number;
    reviews: number;
    stock: number;
    isFeatured: boolean;
    isNew: boolean;
    tags: string[];
}

export interface Category {
    id: number;
    name: string;
    slug: string;
    image: string;
    itemCount: number;
}

export interface FilterOptions {
    category: string | null;
    priceRange: { min: number; max: number } | null;
    rating: number | null;
    sortBy: 'newest' | 'price-low' | 'price-high' | 'popular' | 'rating';
    searchQuery: string;
    brand: string | null;
}

interface ProductState {
    products: Product[];
    featuredProducts: Product[];
    categories: Category[];
    selectedProduct: Product | null;
    filters: FilterOptions;
    isLoading: boolean;
    error: string | null;
    pagination: {
        currentPage: number;
        totalPages: number;
        itemsPerPage: number;
        totalItems: number;
    };
}

const initialState: ProductState = {
    products: [],
    featuredProducts: [],
    categories: [],
    selectedProduct: null,
    filters: {
        category: null,
        priceRange: null,
        rating: null,
        sortBy: 'newest',
        searchQuery: '',
        brand: null,
    },
    isLoading: false,
    error: null,
    pagination: {
        currentPage: 1,
        totalPages: 1,
        itemsPerPage: 12,
        totalItems: 0,
    },
};

const productSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        setProducts: (state, action: PayloadAction<Product[]>) => {
            state.products = action.payload;
            state.isLoading = false;
        },

        setFeaturedProducts: (state, action: PayloadAction<Product[]>) => {
            state.featuredProducts = action.payload;
        },

        setCategories: (state, action: PayloadAction<Category[]>) => {
            state.categories = action.payload;
        },

        setSelectedProduct: (state, action: PayloadAction<Product | null>) => {
            state.selectedProduct = action.payload;
        },

        setFilter: (state, action: PayloadAction<Partial<FilterOptions>>) => {
            state.filters = { ...state.filters, ...action.payload };
        },

        resetFilters: (state) => {
            state.filters = initialState.filters;
        },

        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.filters.searchQuery = action.payload;
        },

        setSortBy: (state, action: PayloadAction<FilterOptions['sortBy']>) => {
            state.filters.sortBy = action.payload;
        },

        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },

        setPagination: (state, action: PayloadAction<Partial<ProductState['pagination']>>) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },

        setCurrentPage: (state, action: PayloadAction<number>) => {
            state.pagination.currentPage = action.payload;
        },
    },
});

export const {
    setProducts,
    setFeaturedProducts,
    setCategories,
    setSelectedProduct,
    setFilter,
    resetFilters,
    setSearchQuery,
    setSortBy,
    setLoading,
    setError,
    setPagination,
    setCurrentPage,
} = productSlice.actions;

export default productSlice.reducer;

/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGetProductsQuery, useGetBrandsQuery } from '@/redux/api/productApi';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import NewProductCard from '@/components/shared/NewProductCard';
import { FiChevronDown, FiX, FiSearch, FiFilter, FiStar } from 'react-icons/fi';

const LIMIT = 24;

const FALLBACK_CATEGORIES = [
    { _id: 'f-electronics', name: 'Electronics', icon: '📱' },
    { _id: 'f-fashion', name: 'Fashion & Clothing', icon: '👗' },
    { _id: 'f-home', name: 'Home & Kitchen', icon: '🏠' },
    { _id: 'f-health', name: 'Health & Beauty', icon: '💊' },
    { _id: 'f-sports', name: 'Sports & Outdoors', icon: '⚽' },
    { _id: 'f-books', name: 'Books & Stationery', icon: '📚' },
    { _id: 'f-grocery', name: 'Grocery & Food', icon: '🛒' },
    { _id: 'f-toys', name: 'Toys & Kids', icon: '🧸' },
    { _id: 'f-shoes', name: 'Shoes & Footwear', icon: '👟' },
    { _id: 'f-accessories', name: 'Watches & Accessories', icon: '⌚' },
];

const SORT_OPTIONS = [
    { label: 'Best Match', value: '' },
    { label: 'Newest First', value: '-createdAt' },
    { label: 'Price: Low → High', value: 'price' },
    { label: 'Price: High → Low', value: '-price' },
    { label: 'Most Popular', value: '-totalSold' },
    { label: 'Top Rated', value: '-rating' },
];

const PRICE_PRESETS = [
    { label: 'Under ৳500', min: '', max: '500' },
    { label: '৳500 – ৳2,000', min: '500', max: '2000' },
    { label: '৳2,000 – ৳10,000', min: '2000', max: '10000' },
    { label: 'Above ৳10,000', min: '10000', max: '' },
];

const RATING_OPTIONS = [4, 3, 2, 1];

/* ── Section header (matches homepage accent bar style) ── */
const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-3">
        <span className="w-[3px] h-4 rounded-full shrink-0" style={{ background: 'var(--color-primary)' }} />
        <h4 className="text-sm font-bold text-gray-800 tracking-tight">{title}</h4>
    </div>
);

interface FilterState {
    min: string;
    max: string;
}

/* ── Sidebar filter panel (shared by desktop + mobile) ── */
const FilterPanel: React.FC<{
    categories: any[];
    selectedCategory: string;
    priceRange: FilterState;
    minRating: number;
    inStockOnly: boolean;
    localSearch: string;
    brands: string[];
    selectedBrand: string;
    showCategoryFilter: boolean;
    showSearch: boolean;
    onCategorySelect: (id: string) => void;
    onPriceChange: (range: FilterState) => void;
    onRatingChange: (r: number) => void;
    onInStockChange: (v: boolean) => void;
    onSearchChange: (v: string) => void;
    onSearchSubmit: (e: React.FormEvent) => void;
    onBrandSelect: (b: string) => void;
    onClear: () => void;
    hasActiveFilters: boolean;
}> = ({
    categories, selectedCategory, priceRange, minRating, inStockOnly, localSearch,
    brands, selectedBrand,
    showCategoryFilter, showSearch,
    onCategorySelect, onPriceChange, onRatingChange, onInStockChange, onSearchChange, onSearchSubmit,
    onBrandSelect,
    onClear, hasActiveFilters,
}) => {
        const activePricePreset = PRICE_PRESETS.findIndex(
            p => p.min === priceRange.min && p.max === priceRange.max
        );

        const [brandSearch, setBrandSearch] = useState('');
        const filteredBrands = useMemo(() => {
            const q = brandSearch.trim().toLowerCase();
            if (!q) return brands;
            return brands.filter(b => b.toLowerCase().includes(q));
        }, [brands, brandSearch]);

        // Build a 2-level tree: each root category carries its sub-categories so the
        // Only parent (top-level) categories are shown in the /products sidebar filter
        const parentCategories = useMemo(() => {
            const parentId = (c: any) => String(c?.parent?._id || c?.parent || '');
            return categories.filter((c: any) => !parentId(c));
        }, [categories]);

        // One filter row for parent categories
        const renderCategoryRow = (cat: any) => {
            const active = cat._id === '' ? !selectedCategory : selectedCategory === cat._id;

            return (
                <li key={cat._id || 'all'}>
                    <label className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group transition-colors hover:bg-gray-50">
                        <span
                            onClick={() => onCategorySelect(cat._id)}
                            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
                            style={active
                                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                                : { background: '#fff', borderColor: '#d1d5db' }}
                        >
                            {active && (
                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </span>
                        <span
                            onClick={() => onCategorySelect(cat._id)}
                            className="flex-1 leading-snug transition-colors select-none text-sm font-semibold"
                            style={active ? { color: 'var(--color-primary)', fontWeight: 700 } : { color: '#1f2937' }}
                        >
                            {cat.name}
                        </span>
                        {cat.productCount > 0 && (
                            <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${active ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'text-gray-400 bg-gray-100'}`}>
                                {cat.productCount}
                            </span>
                        )}
                    </label>
                </li>
            );
        };

        return (
            <div className="space-y-6">
                {/* Search */}
                {showSearch && (
                    <form onSubmit={onSearchSubmit}>
                        <div className="relative">
                            <input
                                type="text"
                                value={localSearch}
                                onChange={e => onSearchChange(e.target.value)}
                                placeholder="Search products…"
                                className="w-full text-sm rounded-md pl-9 pr-3 py-2.5 bg-gray-50 focus:outline-none focus:bg-white transition-colors"
                                style={{ border: '1.5px solid #e5e7eb' }}
                                onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                                onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                            />
                            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        </div>
                    </form>
                )}

                {/* Categories */}
                {showCategoryFilter && (
                    <div>
                        <SectionHeader title="Categories" />
                        <ul className="space-y-0.5 max-h-[420px] overflow-y-auto pr-1">
                            {renderCategoryRow({ _id: '', name: 'All Categories', productCount: 0 })}
                            {parentCategories.map((root: any) => renderCategoryRow(root))}
                        </ul>
                    </div>
                )}

                {/* Price Range */}
                <div>
                    <SectionHeader title="Price Range" />
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {PRICE_PRESETS.map((preset, i) => (
                            <button
                                key={i}
                                onClick={() => onPriceChange(activePricePreset === i ? { min: '', max: '' } : preset)}
                                className="text-[11px] px-2.5 py-1 rounded-full border transition-all"
                                style={activePricePreset === i
                                    ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                                    : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            placeholder="Min ৳"
                            value={priceRange.min}
                            onChange={e => onPriceChange({ ...priceRange, min: e.target.value })}
                            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-2 bg-gray-50 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                        <span className="text-gray-300 shrink-0">—</span>
                        <input
                            type="number"
                            placeholder="Max ৳"
                            value={priceRange.max}
                            onChange={e => onPriceChange({ ...priceRange, max: e.target.value })}
                            className="w-full text-sm border border-gray-200 rounded-md px-2.5 py-2 bg-gray-50 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                        />
                    </div>
                </div>

                {/* Rating */}
                <div>
                    <SectionHeader title="Rating" />
                    <ul className="space-y-0.5">
                        {RATING_OPTIONS.map(r => {
                            const active = minRating === r;
                            return (
                                <li key={r}>
                                    <button
                                        onClick={() => onRatingChange(active ? 0 : r)}
                                        className="flex items-center gap-2 px-2 py-1.5 rounded-md w-full transition-colors hover:bg-gray-50"
                                        style={active ? { background: 'var(--color-primary-lightest, #FEF1EA)' } : {}}
                                    >
                                        <span className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <FiStar
                                                    key={s}
                                                    size={13}
                                                    style={{
                                                        color: '#f59e0b',
                                                        fill: s <= r ? '#f59e0b' : 'none',
                                                    }}
                                                />
                                            ))}
                                        </span>
                                        <span
                                            className="text-[12px]"
                                            style={active ? { color: 'var(--color-primary)', fontWeight: 600 } : { color: '#6b7280' }}
                                        >
                                            &amp; Up
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Brand */}
                {brands.length > 0 && (
                    <div>
                        <SectionHeader title="Brand" />
                        {brands.length > 8 && (
                            <div className="relative mb-2">
                                <input
                                    type="text"
                                    value={brandSearch}
                                    onChange={e => setBrandSearch(e.target.value)}
                                    placeholder="Search brands…"
                                    className="w-full text-xs rounded-md pl-8 pr-3 py-2 bg-gray-50 focus:outline-none focus:bg-white transition-colors"
                                    style={{ border: '1.5px solid #e5e7eb' }}
                                    onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                                    onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
                                />
                                <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        )}
                        <ul className="space-y-0.5 max-h-52 overflow-y-auto pr-1">
                            {filteredBrands.length === 0 ? (
                                <li className="px-2 py-1.5 text-[12px] text-gray-400">No brands found</li>
                            ) : (
                                filteredBrands.map((brand) => {
                                    const active = selectedBrand === brand;
                                    return (
                                        <li key={brand}>
                                            <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer group transition-colors hover:bg-gray-50">
                                                <span
                                                    onClick={() => onBrandSelect(active ? '' : brand)}
                                                    className="shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all"
                                                    style={active
                                                        ? { borderColor: 'var(--color-primary)' }
                                                        : { background: '#fff', borderColor: '#d1d5db' }}
                                                >
                                                    {active && (
                                                        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
                                                    )}
                                                </span>
                                                <span
                                                    onClick={() => onBrandSelect(active ? '' : brand)}
                                                    className="flex-1 text-sm leading-snug transition-colors select-none truncate"
                                                    style={active ? { color: 'var(--color-primary)', fontWeight: 600 } : { color: '#4b5563' }}
                                                >
                                                    {brand}
                                                </span>
                                            </label>
                                        </li>
                                    );
                                })
                            )}
                        </ul>
                    </div>
                )}

                {/* In stock */}
                <div>
                    <SectionHeader title="Availability" />
                    <label className="flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-gray-50">
                        <span
                            onClick={() => onInStockChange(!inStockOnly)}
                            className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
                            style={inStockOnly
                                ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                                : { background: '#fff', borderColor: '#d1d5db' }}
                        >
                            {inStockOnly && (
                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </span>
                        <span
                            onClick={() => onInStockChange(!inStockOnly)}
                            className="text-sm select-none"
                            style={inStockOnly ? { color: 'var(--color-primary)', fontWeight: 600 } : { color: '#4b5563' }}
                        >
                            In stock only
                        </span>
                    </label>
                </div>

                {/* Clear filters */}
                {hasActiveFilters && (
                    <button
                        onClick={onClear}
                        className="w-full text-sm py-2.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                        <FiX size={13} /> Clear All Filters
                    </button>
                )}
            </div>
        );
    };

/* ══════════════════════════════════════════════════════════ */

export interface StoreListingProps {
    /** Locks the listing to one category (category page). Disables the category filter UI. */
    lockedCategory?: string;
    /** Hide the category filter section (e.g. on the category page where the category is fixed). */
    hideCategoryFilter?: boolean;
    /** Whether to read/write filters from the URL query string (used by /products & /shop). Default false. */
    syncUrl?: boolean;
    /** Optional header content rendered above the toolbar (store banner, category header, chips, etc.). */
    headerSlot?: React.ReactNode;
    /** Optional message shown when there are zero results. */
    emptyTitle?: string;
}

const StoreListing: React.FC<StoreListingProps> = ({
    lockedCategory,
    hideCategoryFilter = false,
    syncUrl = false,
    headerSlot,
    emptyTitle = 'No products found',
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sortRef = useRef<HTMLDivElement>(null);

    const categoryParam = syncUrl ? (searchParams.get('category') || '') : '';
    const searchParam = syncUrl ? (searchParams.get('q') || '') : '';

    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState('');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showMobileFilter, setShowMobileFilter] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(categoryParam);
    const [localSearch, setLocalSearch] = useState(searchParam);
    const [activeSearch, setActiveSearch] = useState(syncUrl ? searchParam : '');
    const [priceRange, setPriceRange] = useState<FilterState>({ min: '', max: '' });
    const [minRating, setMinRating] = useState(0);
    const [inStockOnly, setInStockOnly] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState('');

    const showCategoryFilter = !lockedCategory && !hideCategoryFilter;

    /* categories */
    const { data: categoriesData } = useGetCategoriesQuery({});
    const categories = useMemo(() => {
        const api = categoriesData?.data;
        return api?.length > 0 ? api : FALLBACK_CATEGORIES;
    }, [categoriesData]);

    /* brands (server-provided distinct list) */
    const { data: brandsData } = useGetBrandsQuery(undefined);
    const brands: string[] = useMemo(() => {
        const api = brandsData?.data;
        return Array.isArray(api) ? api : [];
    }, [brandsData]);

    /* sync URL → state */
    useEffect(() => {
        if (!syncUrl) return;
        setSelectedCategory(categoryParam);
        setLocalSearch(searchParam);
        setActiveSearch(searchParam);
        setPage(1);
    }, [syncUrl, categoryParam, searchParam]);

    /* close sort dropdown on outside click */
    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    /* reset to page 1 when any server-side filter changes */
    useEffect(() => {
        setPage(1);
    }, [lockedCategory, selectedCategory, activeSearch, priceRange.min, priceRange.max, sortBy, selectedBrand, minRating, inStockOnly]);

    const effectiveCategory = lockedCategory || selectedCategory;



    const queryParams = useMemo(() => {
        const p: any = { page, limit: LIMIT };
        if (sortBy) p.sort = sortBy;
        if (effectiveCategory) p.category = effectiveCategory;
        if (activeSearch) p.searchTerm = activeSearch;
        if (priceRange.min) p.minPrice = priceRange.min;
        if (priceRange.max) p.maxPrice = priceRange.max;
        if (selectedBrand) p.brand = selectedBrand;
        if (minRating > 0) p.minRating = minRating;
        if (inStockOnly) p.inStock = 'true';
        return p;
    }, [page, sortBy, effectiveCategory, activeSearch, priceRange, selectedBrand, minRating, inStockOnly]);

    const { data, isFetching } = useGetProductsQuery(queryParams);
    const rawProducts = data?.data || [];
    const meta = data?.meta || { total: 0, totalPage: 1 };
    const totalPages = meta.totalPage || meta.totalPages || 1;

    /* Rating + stock are now filtered server-side (correct across pagination).
       Kept here only as a harmless safety net if the API returns extra rows. */
    const products = useMemo(() => {
        return rawProducts.filter((p: any) => {
            if (minRating > 0 && (p.rating || 0) < minRating) return false;
            if (inStockOnly && (p.stock ?? 0) <= 0) return false;
            return true;
        });
    }, [rawProducts, minRating, inStockOnly]);

    const activeCategoryName = categories.find((c: any) => c._id === selectedCategory)?.name || '';
    const hasActiveFilters = !!(
        (showCategoryFilter && selectedCategory) ||
        activeSearch ||
        priceRange.min ||
        priceRange.max ||
        minRating ||
        inStockOnly ||
        selectedBrand ||
        false
    );

    const pushURL = (catId: string, q: string) => {
        if (!syncUrl) return;
        const p = new URLSearchParams();
        if (catId) p.set('category', catId);
        if (q) p.set('q', q);
        router.push(`/products${p.toString() ? `?${p}` : ''}`);
    };

    const handleCategorySelect = (catId: string) => {
        setSelectedCategory(catId);
        if (syncUrl) pushURL(catId, activeSearch);
        setShowMobileFilter(false);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = localSearch.trim();
        setActiveSearch(q);
        if (syncUrl) pushURL(selectedCategory, q);
    };

    const clearFilters = () => {
        setSelectedCategory('');
        setLocalSearch('');
        setActiveSearch('');
        setPriceRange({ min: '', max: '' });
        setMinRating(0);
        setInStockOnly(false);
        setSelectedBrand('');
            if (syncUrl) router.push('/products');
        setShowMobileFilter(false);
    };

    /* Pagination helper */
    const pageNums = useMemo(() => {
        const total = totalPages;
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        if (page <= 4) return [1, 2, 3, 4, 5, -1, total];
        if (page >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
        return [1, -1, page - 1, page, page + 1, -2, total];
    }, [page, totalPages]);

    const filterPanelProps = {
        categories,
        selectedCategory,
        priceRange,
        minRating,
        inStockOnly,
        localSearch,
        brands,
        selectedBrand,
        showCategoryFilter,
        showSearch: true,
        onCategorySelect: handleCategorySelect,
        onPriceChange: setPriceRange,
        onRatingChange: setMinRating,
        onInStockChange: setInStockOnly,
        onSearchChange: setLocalSearch,
        onSearchSubmit: handleSearchSubmit,
        onBrandSelect: (b: string) => { setSelectedBrand(b); setShowMobileFilter(false); },
        onClear: clearFilters,
        hasActiveFilters,
    };

    return (
        <>
            {headerSlot}

            <div className="container mx-auto px-2 sm:px-4 py-5">
                <div className="flex gap-5">

                    {/* ── Desktop Sidebar ── */}
                    <aside className="hidden lg:block w-60 shrink-0">
                        <div
                            className="bg-white rounded-md border border-gray-100 p-4 sticky"
                            style={{ top: 88, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
                        >
                            <FilterPanel {...filterPanelProps} />
                        </div>
                    </aside>

                    {/* ── Main content ── */}
                    <div className="flex-1 min-w-0">

                        {/* Top sort bar */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Mobile filter button */}
                                <button
                                    onClick={() => setShowMobileFilter(true)}
                                    className="lg:hidden flex items-center gap-1.5 text-xs font-semibold border border-gray-200 rounded-md px-3 py-2 bg-white hover:border-[var(--color-primary)] transition-colors"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    <FiFilter size={13} /> Filters
                                    {hasActiveFilters && (
                                        <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: 'var(--color-primary)' }} />
                                    )}
                                </button>

                                {/* Active filter chips */}
                                {showCategoryFilter && activeCategoryName && (
                                    <span
                                        className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'var(--color-primary-lightest, #FEF1EA)', color: 'var(--color-primary)' }}
                                    >
                                        {activeCategoryName}
                                        <button onClick={() => handleCategorySelect('')} className="hover:opacity-70"><FiX size={11} /></button>
                                    </span>
                                )}
                                {(priceRange.min || priceRange.max) && (
                                    <span
                                        className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'var(--color-primary-lightest, #FEF1EA)', color: 'var(--color-primary)' }}
                                    >
                                        {priceRange.min ? `৳${priceRange.min}` : '0'} – {priceRange.max ? `৳${priceRange.max}` : '∞'}
                                        <button onClick={() => setPriceRange({ min: '', max: '' })} className="hover:opacity-70"><FiX size={11} /></button>
                                    </span>
                                )}
                                {minRating > 0 && (
                                    <span
                                        className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'var(--color-primary-lightest, #FEF1EA)', color: 'var(--color-primary)' }}
                                    >
                                        {minRating}★ &amp; up
                                        <button onClick={() => setMinRating(0)} className="hover:opacity-70"><FiX size={11} /></button>
                                    </span>
                                )}
                                {selectedBrand && (
                                    <span
                                        className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'var(--color-primary-lightest, #FEF1EA)', color: 'var(--color-primary)' }}
                                    >
                                        {selectedBrand}
                                        <button onClick={() => setSelectedBrand('')} className="hover:opacity-70"><FiX size={11} /></button>
                                    </span>
                                )}
                                {inStockOnly && (
                                    <span
                                        className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ background: 'var(--color-primary-lightest, #FEF1EA)', color: 'var(--color-primary)' }}
                                    >
                                        In stock
                                        <button onClick={() => setInStockOnly(false)} className="hover:opacity-70"><FiX size={11} /></button>
                                    </span>
                                )}
                                {activeSearch && (
                                    <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                        &quot;{activeSearch}&quot;
                                        <button onClick={() => { setActiveSearch(''); setLocalSearch(''); if (syncUrl) pushURL(selectedCategory, ''); }} className="hover:opacity-70"><FiX size={11} /></button>
                                    </span>
                                )}
                            </div>

                            {/* Sort */}
                            <div className="relative shrink-0" ref={sortRef}>
                                <button
                                    onClick={() => setShowSortDropdown(v => !v)}
                                    className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 rounded-md px-3 py-2 bg-white hover:border-[var(--color-primary)] transition-colors text-gray-600"
                                >
                                    <span className="hidden sm:inline text-gray-400">Sort:</span>
                                    {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
                                    <FiChevronDown size={12} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                                </button>
                                {showSortDropdown && (
                                    <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 rounded-md shadow-xl py-1.5 z-30 w-48"
                                        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}>
                                        {SORT_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value || 'best'}
                                                onClick={() => { setSortBy(opt.value); setShowSortDropdown(false); }}
                                                className="w-full text-left text-[13px] px-4 py-2.5 hover:bg-gray-50 transition-colors"
                                                style={sortBy === opt.value
                                                    ? { color: 'var(--color-primary)', fontWeight: 600, background: 'var(--color-primary-lightest, #FEF1EA)' }
                                                    : { color: '#374151' }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Product Grid */}
                        {isFetching && products.length === 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="bg-white border border-gray-200 animate-pulse">
                                        <div className="aspect-square bg-gray-100" />
                                        <div className="px-2.5 py-2 space-y-1.5">
                                            <div className="h-3 bg-gray-100 rounded w-3/4" />
                                            <div className="h-3 bg-gray-100 rounded w-1/3" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : products.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-md border border-gray-100">
                                <div className="text-6xl mb-4">🔍</div>
                                <h3 className="text-lg font-bold text-gray-700 mb-1">{emptyTitle}</h3>
                                <p className="text-sm text-gray-400 mb-6">Try adjusting your filters or search term</p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearFilters}
                                        className="px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
                                        style={{ background: 'var(--color-primary)' }}
                                    >
                                        Clear Filters
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 transition-opacity duration-200 ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
                                {products.map((product: any) => (
                                    <NewProductCard
                                        key={product._id}
                                        product={{
                                            id: product._id,
                                            slug: product.slug,
                                            name: product.name,
                                            image: product.thumbnail || product.images?.[0] || '',
                                            price: product.price,
                                            originalPrice: product.originalPrice || undefined,
                                            mrp: product.originalPrice || undefined,
                                            discount: product.discount,
                                            rating: product.rating,
                                            reviews: product.reviewCount,
                                            warranty: product.tagline || '',
                                            categoryName: product.category?.name || '',
                                            priceType: product.priceType || 'negotiable',
                                            sold: product.totalSold || 0,
                                            likeCount: product.likeCount || 0,
                                            commentCount: product.commentCount || 0,
                                            shareCount: product.shareCount || 0,
                                            viewCount: product.viewCount || 0,
                                            reviewCount: product.reviewCount || 0,
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1.5 mt-8">
                                <button
                                    disabled={page === 1}
                                    onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-500 hover:border-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    ← Prev
                                </button>
                                {pageNums.map((num, i) =>
                                    num < 0 ? (
                                        <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                                    ) : (
                                        <button
                                            key={num}
                                            onClick={() => { setPage(num); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            className="w-9 h-9 text-sm rounded-md border transition-colors"
                                            style={page === num
                                                ? { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' }
                                                : { background: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }}
                                        >
                                            {num}
                                        </button>
                                    )
                                )}
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white text-gray-500 hover:border-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Mobile Filter Drawer ── */}
            {showMobileFilter && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowMobileFilter(false)}
                    />
                    <div
                        className="relative w-72 max-w-[85vw] bg-white h-full overflow-y-auto p-5 shadow-2xl"
                        style={{ animation: 'slideInLeft 0.22s ease-out' }}
                    >
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-base font-extrabold text-gray-900">Filters</h3>
                            <button
                                onClick={() => setShowMobileFilter(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
                            >
                                <FiX size={16} />
                            </button>
                        </div>
                        <FilterPanel {...filterPanelProps} />
                        <button
                            onClick={() => setShowMobileFilter(false)}
                            className="mt-5 w-full py-3 text-sm font-bold text-white rounded-md transition-opacity hover:opacity-90"
                            style={{ background: 'var(--color-primary)' }}
                        >
                            Show Results
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideInLeft {
                    from { transform: translateX(-100%); }
                    to   { transform: translateX(0); }
                }
            `}</style>
        </>
    );
};

export default StoreListing;

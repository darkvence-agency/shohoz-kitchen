/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/redux';
import { addToCart, removeFromCart, increaseQuantity, decreaseQuantity, clearCart, updateCartItemVariant, CartItem } from '@/redux/slices/cartSlice';
import { saveForLater, removeFromSaved, hydrateSaved } from '@/redux/slices/savedForLaterSlice';
import { FiTrash2, FiChevronLeft, FiAlertTriangle, FiMinus, FiPlus, FiShoppingCart, FiTag, FiX, FiCheck, FiBookmark, FiHeart, FiChevronRight } from 'react-icons/fi';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'react-hot-toast';
import { useValidateCouponMutation } from '@/redux/api/couponApi';
import { useGetShippingQuoteQuery, useGetShippingSettingsQuery } from '@/redux/api/shippingApi';
import { useGetProductByIdQuery } from '@/redux/api/productApi';
import { getDisplayPrice } from '@/utils/offerPrice';

const COUPON_STORAGE_KEY = 'shohozkitchen_applied_coupon';
const SELECTED_STORAGE_KEY = 'shohozkitchen_selected_cart';

// Resolve common colour names to a CSS hex so the swatch dot always renders.
const COLOR_HEX_MAP: Record<string, string> = {
    red: '#FF0000', orange: '#FF8C00', yellow: '#FFD700', green: '#00C853', blue: '#2196F3',
    black: '#000000', white: '#FFFFFF', pink: '#FF69B4', purple: '#9C27B0', brown: '#795548',
    gray: '#9E9E9E', grey: '#9E9E9E', navy: '#001F3F', teal: '#009688', maroon: '#800000',
    olive: '#808000', cyan: '#00BCD4', lime: '#76FF03', coral: '#FF7F50', gold: '#FFD700',
    silver: '#C0C0C0', beige: '#F5F5DC', cream: '#FFFDD0', khaki: '#F0E68C',
};
const resolveHex = (value?: string) => {
    if (!value) return '';
    return COLOR_HEX_MAP[value.toLowerCase()] || value;
};

type ColorSwatch = { name: string; hex: string };

/**
 * Inline variant editor for one cart line.
 * Fetches the line's product, surfaces its colour/size options, lets the shopper
 * change them right in the cart, and reports back whether a required choice is
 * still missing (so the page can block checkout until it's resolved).
 */
const CartItemVariants = ({
    item,
    onStatusChange,
}: {
    item: CartItem;
    onStatusChange: (id: string, incomplete: boolean) => void;
}) => {
    const dispatch = useAppDispatch();
    const { data: productRes } = useGetProductByIdQuery(item.productId, { skip: !item.productId });
    const product = (productRes as any)?.data;

    const variants: any[] = product?.variants || [];
    const hasVariants = variants.length > 0;

    // Colour options — from variants, else the legacy colors[] array.
    const colorSwatches: ColorSwatch[] = useMemo(() => {
        if (!product) return [];
        if (hasVariants) {
            const map = new Map<string, string>();
            variants.forEach((v: any) => { if (v.color) map.set(v.color, resolveHex(v.colorHex || v.color)); });
            return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
        }
        if (product.colors?.length > 0) {
            return product.colors.map((c: string, i: number) => ({ name: c, hex: resolveHex(product.colorHex?.[i] || c) }));
        }
        return [];
    }, [product, hasVariants, variants]);

    // Size options — from variants, else the legacy sizes[] array.
    const sizeList: string[] = useMemo(() => {
        if (!product) return [];
        if (hasVariants) return [...new Set(variants.filter((v: any) => v.size).map((v: any) => v.size))] as string[];
        return product.sizes?.length > 0 ? product.sizes : [];
    }, [product, hasVariants, variants]);

    const needsColor = colorSwatches.length > 0;
    const needsSize = sizeList.length > 0;
    // const incomplete = false;

    // Tell the parent this line's status and sync variant pricing / mrp / discount when product loads.
    useEffect(() => {
        if (!product) return;
        onStatusChange(item.id, false);

        if (hasVariants && (item.color || item.size)) {
            const v = variants.find((vv: any) => (!item.color || vv.color === item.color) && (!item.size || vv.size === item.size));
            if (v) {
                const vDiscount = typeof v.discount === 'number' ? v.discount : 0;
                const vMrp = v.originalPrice || v.price;
                if (item.discount !== vDiscount || item.mrp !== vMrp || item.price !== v.price || (v._id && item.variantId !== v._id)) {
                    dispatch(updateCartItemVariant({
                        id: item.id,
                        color: item.color,
                        colorHex: item.colorHex,
                        size: item.size,
                        price: v.price,
                        mrp: vMrp,
                        image: v.images?.[0] || item.image,
                        discount: vDiscount,
                        variantId: v._id,
                        wholesalePrice: v.costPrice ?? product.costPrice ?? product.wholesalePrice ?? 0,
                    }));
                }
            }
        }
    }, [product, item.id, item.color, item.size, item.discount, item.mrp, item.price, item.variantId, item.colorHex, item.image, onStatusChange, hasVariants, variants, dispatch]);

    // Which colours/sizes are valid given the other axis' current choice.
    const availableColors = useMemo(() => {
        if (!hasVariants || !item.size) return colorSwatches.map(c => c.name);
        return variants.filter((v: any) => v.size === item.size).map((v: any) => v.color).filter(Boolean);
    }, [hasVariants, item.size, variants, colorSwatches]);

    const availableSizes = useMemo(() => {
        if (!hasVariants || !item.color) return sizeList;
        return variants.filter((v: any) => v.color === item.color).map((v: any) => v.size).filter(Boolean);
    }, [hasVariants, item.color, variants, sizeList]);

    // Commit a colour+size pick: resolve the matching variant for price/image/hex, then dispatch.
    const apply = (color: string, size: string) => {
        let nextSize = size;
        if (hasVariants && color && nextSize) {
            const sizesForColor = variants.filter((v: any) => v.color === color).map((v: any) => v.size).filter(Boolean);
            if (sizesForColor.length > 0 && !sizesForColor.includes(nextSize)) nextSize = '';
        }

        let colorHex = color ? resolveHex(colorSwatches.find(c => c.name === color)?.hex || color) : undefined;
        let price: number | undefined;
        let mrp: number | undefined;
        let image: string | undefined;
        let discount: number | undefined;
        let variantId: string | undefined;
        let wholesalePrice: number | undefined;

        if (hasVariants && (color || nextSize)) {
            const v = variants.find((vv: any) => (!color || vv.color === color) && (!nextSize || vv.size === nextSize));
            if (v) {
                price = v.price;
                mrp = v.originalPrice || v.price;
                discount = typeof v.discount === 'number' ? v.discount : 0;
                variantId = v._id;
                wholesalePrice = v.costPrice ?? product.costPrice ?? product.wholesalePrice ?? 0;
                if (v.colorHex) colorHex = resolveHex(v.colorHex);
                if (v.images?.[0]) image = v.images[0];
            }
        } else if (product) {
            // Deselected / no variant selected → restore base product values
            const offerDisplay = getDisplayPrice(product);
            price = offerDisplay.currentPrice;
            mrp = product.originalPrice || product.price;
            discount = offerDisplay.discount;
            variantId = undefined;
            wholesalePrice = product.costPrice ?? product.wholesalePrice ?? 0;
            image = product.thumbnail;
        }

        dispatch(updateCartItemVariant({
            id: item.id,
            color: color || undefined,
            colorHex: colorHex || undefined,
            size: nextSize || undefined,
            price,
            mrp,
            image,
            discount,
            variantId,
            wholesalePrice,
        }));
    };

    // Product without selectable variants → keep the original read-only badges (no regression).
    if (!needsColor && !needsSize) {
        if (!item.color && !item.size) return null;
        return (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {item.color && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        <span className="w-2 h-2 rounded-full border border-gray-200" style={{ background: item.colorHex || '#ccc' }} />
                        {item.color}
                    </span>
                )}
                {item.size && (
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.size}</span>
                )}
            </div>
        );
    }

    return (
        <div className="mt-2 rounded-md">
            {needsColor && (
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-[11px] font-medium text-gray-500 w-10">Color</span>
                    {item.color && <span className="text-[11px] font-semibold text-gray-800">{item.color}</span>}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {colorSwatches.map((c) => {
                            const selected = item.color === c.name;
                            const disabled = !availableColors.includes(c.name);
                            return (
                                <button
                                    key={c.name}
                                    type="button"
                                    title={c.name}
                                    disabled={disabled}
                                    onClick={() => apply(selected ? '' : c.name, item.size || '')}
                                    className="w-6 h-6 rounded-full flex-shrink-0 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                                    style={{
                                        background: c.hex,
                                        border: selected ? '2px solid var(--color-primary)' : '1.5px solid #d1d5db',
                                        boxShadow: selected ? '0 0 0 2px rgba(var(--color-primary-rgb), 0.2)' : 'none',
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
            {needsSize && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-gray-500 w-10">Size</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {sizeList.map((s) => {
                            const selected = item.size === s;
                            const disabled = !availableSizes.includes(s);
                            return (
                                <button
                                    key={s}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => apply(item.color || '', selected ? '' : s)}
                                    className={`min-w-[30px] h-7 px-2 rounded text-[11px] font-semibold transition-all disabled:opacity-35 disabled:cursor-not-allowed ${
                                        selected
                                            ? 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/[0.08]'
                                            : 'border border-gray-300 text-gray-700 bg-white hover:border-gray-400'
                                    }`}
                                >
                                    {s}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const CartPage = () => {
    const { items, totalQuantity } = useAppSelector((state) => state.cart);
    const savedItems = useAppSelector((state) => state.savedForLater.items);
    const dispatch = useAppDispatch();
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; finalAmount: number; message: string; freeShipping?: boolean } | null>(null);
    const [couponError, setCouponError] = useState('');
    const [validateCoupon, { isLoading: isValidating }] = useValidateCouponMutation();

    // ─── Per-item selection (Daraz-style "Select All") ──
    // New items start selected; deselected items stay deselected across re-renders.
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const knownIdsRef = useRef<string[]>([]);
    useEffect(() => {
        const ids = items.map(i => i.id);
        const newOnes = ids.filter(id => !knownIdsRef.current.includes(id));
        setSelectedIds(prev => Array.from(new Set([...prev.filter(id => ids.includes(id)), ...newOnes])));
        knownIdsRef.current = ids;
    }, [items]);

    const isSelected = (id: string) => selectedIds.includes(id);
    const allSelected = items.length > 0 && selectedIds.length === items.length;
    const toggleItem = (id: string) =>
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    const toggleAll = () => setSelectedIds(allSelected ? [] : items.map(i => i.id));

    const selectedItems = items.filter(i => selectedIds.includes(i.id));
    const selectedSubtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const selectedQty = selectedItems.reduce((s, i) => s + i.quantity, 0);

    // ─── Variant completeness (color/size) reported by each line ──
    // A line with variation options but no choice made blocks checkout.
    const [variantIssues, setVariantIssues] = useState<Record<string, boolean>>({});
    const reportVariantStatus = useCallback((id: string, incomplete: boolean) => {
        setVariantIssues(prev => (prev[id] === incomplete ? prev : { ...prev, [id]: incomplete }));
    }, []);
    const incompleteSelected = selectedItems.filter(i => variantIssues[i.id]);
    const hasVariantIssues = incompleteSelected.length > 0;
    const canCheckout = selectedIds.length > 0 && !hasVariantIssues;

    const deleteSelected = () => {
        if (selectedIds.length === 0) return;
        selectedIds.forEach(id => dispatch(removeFromCart(id)));
        setSelectedIds([]);
        toast.success('Selected items removed');
    };
    // Hand the selected ids to the checkout page so only chosen items are ordered.
    const goCheckout = () => {
        try { localStorage.setItem(SELECTED_STORAGE_KEY, JSON.stringify(selectedIds)); } catch {}
    };

    // Restore saved coupon on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(COUPON_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                setAppliedCoupon(parsed);
                setCouponCode(parsed.code);
            }
        } catch {}
    }, []);

    // Hydrate the saved-for-later list from localStorage on mount
    useEffect(() => {
        dispatch(hydrateSaved());
    }, [dispatch]);

    // Move a line from the cart into the saved-for-later list
    const handleSaveForLater = (item: typeof items[number]) => {
        dispatch(saveForLater(item));
        dispatch(removeFromCart(item.id));
        toast.success('Saved for later');
    };

    // Move a saved item back into the cart
    const handleMoveToCart = (item: typeof savedItems[number]) => {
        dispatch(addToCart(item));
        dispatch(removeFromSaved(item.id));
        toast.success('Moved to cart');
    };

    const handleApplyCoupon = async () => {
        const code = couponCode.trim().toUpperCase();
        if (!code) return;
        setCouponError('');
        try {
            const result = await validateCoupon({
                code,
                orderAmount: selectedSubtotal,
                // Send selected items so a product/category-scoped coupon previews the discount
                // on just the eligible items (matches what the server charges at checkout).
                items: selectedItems.map(i => ({ product: i.productId, amount: i.price * i.quantity })),
            }).unwrap();
            const couponData = {
                code,
                discount: result.data?.discount ?? result.discount ?? 0,
                finalAmount: result.data?.finalAmount ?? result.finalAmount ?? selectedSubtotal,
                message: result.data?.message ?? result.message ?? 'Coupon applied!',
                freeShipping: Boolean(result.data?.freeShipping ?? result.freeShipping),
            };
            setAppliedCoupon(couponData);
            localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(couponData));
            toast.success('Coupon applied successfully!');
        } catch (err: any) {
            const msg = err?.data?.message || 'Invalid or expired coupon code';
            setCouponError(msg);
            toast.error(msg);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponError('');
        localStorage.removeItem(COUPON_STORAGE_KEY);
    };

    // ─── Estimated shipping (no city yet → backend returns the default flat rate) ──
    const { data: shippingQuote } = useGetShippingQuoteQuery(
        { subtotal: selectedSubtotal },
        { skip: selectedSubtotal <= 0 },
    );
    const couponFreeShipping = Boolean(appliedCoupon?.freeShipping);
    const freeShipping = couponFreeShipping || (shippingQuote?.freeShipping ?? (selectedSubtotal >= 5000));
    const shippingCost = freeShipping ? 0 : (shippingQuote?.shippingCost ?? (selectedSubtotal >= 5000 ? 0 : 120));

    // Live free-shipping threshold → "add ৳X more for free shipping" nudge.
    const { data: shipSettings } = useGetShippingSettingsQuery();
    const freeThreshold = shipSettings?.freeShippingByThresholdEnabled ? (shipSettings?.freeShippingThreshold || 0) : 0;
    const remainingForFree = freeThreshold > 0 && !freeShipping ? Math.max(0, freeThreshold - selectedSubtotal) : 0;

    // Total = (coupon ? finalAmount : selected subtotal) + estimated shipping
    const baseAmount = appliedCoupon ? appliedCoupon.finalAmount : selectedSubtotal;
    const finalTotal = baseAmount + shippingCost;

    const handleClearCart = () => {
        if (window.confirm('Are you sure you want to clear your cart?')) {
            dispatch(clearCart());
            toast.success('Cart cleared');
        }
    };

    /* ═══ SAVED FOR LATER SECTION (shared between empty + filled cart) ═══ */
    const savedSection = savedItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="px-4 sm:px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                <FiHeart size={16} className="text-[var(--color-primary)]" />
                <h2 className="text-sm font-semibold text-gray-900">
                    Saved for Later
                    <span className="ml-2 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {savedItems.length}
                    </span>
                </h2>
            </div>
            <div className="divide-y divide-gray-100">
                {savedItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 sm:px-5 py-4">
                        <div className="w-16 h-16 rounded border border-gray-100 bg-white p-1 flex-shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm text-gray-800 line-clamp-2 leading-snug">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-sm font-semibold text-[var(--color-primary)]">৳{item.price.toLocaleString()}</span>
                                {item.mrp && item.mrp > 0 && item.mrp !== item.price && (
                                    <span className="text-xs text-gray-400 line-through">৳{item.mrp.toLocaleString()}</span>
                                )}
                                {typeof item.discount === 'number' && (item.discount > 0 || (item.mrp && item.mrp > 0 && item.mrp !== item.price)) && (
                                    <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/[0.1] px-1.5 py-0.5 rounded">
                                        {item.discount > 0 ? `-${item.discount}%` : `${item.discount}%`}
                                    </span>
                                )}
                                {item.color && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                        <span className="w-2 h-2 rounded-full border border-gray-200" style={{ background: item.colorHex || '#ccc' }} />
                                        {item.color}
                                    </span>
                                )}
                                {item.size && (
                                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                        {item.size}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 mt-2.5">
                                <button
                                    onClick={() => handleMoveToCart(item)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity px-3 py-1.5 rounded"
                                >
                                    <FiShoppingCart size={12} />
                                    Move to Cart
                                </button>
                                <button
                                    onClick={() => dispatch(removeFromSaved(item.id))}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
                                >
                                    <FiTrash2 size={12} />
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    /* ═══ EMPTY CART STATE ═══ */
    if (items.length === 0) {
        return (
            <div className="bg-[#F8FAFC] min-h-screen pb-20">
                {savedItems.length === 0 ? (
                    <div className="py-20">
                        <EmptyState
                            title="Your cart is empty"
                            description="Looks like you haven't added anything to your cart yet."
                            buttonText="Start Shopping"
                            buttonLink="/products"
                        />
                    </div>
                ) : (
                    <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 pt-6 max-w-6xl">
                        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-5 transition-colors">
                            <FiChevronLeft size={16} />
                            Back to Shopping
                        </Link>
                        <div className="bg-white rounded-lg shadow-sm px-5 py-8 text-center mb-6">
                            <FiShoppingCart size={28} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">Your cart is empty — your saved items are below.</p>
                        </div>
                        {savedSection}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-[#F8FAFC] min-h-screen pb-24 lg:pb-20">
            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16 pt-6 max-w-6xl">

                {/* ═══ HEADER ═══ */}
                <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
                    <FiChevronLeft size={16} />
                    Back to Shopping
                </Link>

                <div className="flex items-center justify-between mb-5">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Shopping Cart
                        <span className="ml-2 text-sm font-medium text-gray-500">
                            ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'})
                        </span>
                    </h1>
                    <button
                        onClick={handleClearCart}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-500 transition-colors"
                    >
                        <FiTrash2 size={13} />
                        Clear Cart
                    </button>
                </div>

                {/* ═══ MAIN LAYOUT ═══ */}
                <div className="flex flex-col lg:grid lg:grid-cols-12 gap-5">

                    {/* ═══ LEFT: CART ITEMS ═══ */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-lg shadow-sm overflow-hidden">

                            {/* Select-all bar (Daraz-style) */}
                            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-100">
                                <button onClick={toggleAll} className="flex items-center gap-2.5 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                    <span className={`w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors ${allSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-gray-300'}`}>
                                        {allSelected && <FiCheck size={12} className="text-white" />}
                                    </span>
                                    Select All ({items.length} Item{items.length !== 1 ? 's' : ''})
                                </button>
                                <button
                                    onClick={deleteSelected}
                                    disabled={selectedIds.length === 0}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors disabled:opacity-40 disabled:hover:text-gray-500 uppercase"
                                >
                                    <FiTrash2 size={14} /> Delete
                                </button>
                            </div>

                            {/* Cart Items */}
                            <div className="divide-y divide-gray-100">
                                {items.map((item) => (
                                    <div key={item.id} className="group flex gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                                        {/* Select checkbox */}
                                        <button onClick={() => toggleItem(item.id)} className="self-center flex-shrink-0" aria-label="Select item">
                                            <span className={`w-[18px] h-[18px] rounded border flex items-center justify-center transition-colors ${isSelected(item.id) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-gray-300'}`}>
                                                {isSelected(item.id) && <FiCheck size={12} className="text-white" />}
                                            </span>
                                        </button>
                                        {/* Product image */}
                                        <div className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-md border border-gray-100 bg-white p-1.5 flex-shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0 flex flex-col">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="text-sm text-gray-800 line-clamp-2 leading-snug pr-1">{item.name}</h3>
                                                {/* Delete (desktop) */}
                                                <button
                                                    onClick={() => setDeleteConfirmId(item.id)}
                                                    className="hidden sm:flex w-7 h-7 rounded items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                                                    aria-label="Remove item"
                                                >
                                                    <FiTrash2 size={15} />
                                                </button>
                                            </div>

                                            {/* Variant editor (color / size) — read-only badges when the product has no options */}
                                            <CartItemVariants item={item} onStatusChange={reportVariantStatus} />

                                            {/* Unit price */}
                                            {(() => {
                                                const itemDiscount = typeof item.discount === 'number'
                                                    ? item.discount
                                                    : (item.mrp && item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0);
                                                const showStrikePrice = item.mrp && item.mrp > 0 && item.mrp !== item.price;
                                                const showDiscountBadge = (typeof item.discount === 'number' && (item.discount > 0 || showStrikePrice)) || itemDiscount > 0;
                                                return (
                                                    <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-[var(--color-primary)]">৳{item.price.toLocaleString()}</span>
                                                        {showStrikePrice && (
                                                            <span className="text-xs text-gray-400 line-through">৳{item.mrp.toLocaleString()}</span>
                                                        )}
                                                        {showDiscountBadge && (
                                                            <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/[0.1] px-1.5 py-0.5 rounded">
                                                                {itemDiscount > 0 ? `-${itemDiscount}%` : `${itemDiscount}%`}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Bottom row: stepper + line total */}
                                            <div className="mt-auto pt-3 flex items-end justify-between gap-2">
                                                <div className="flex flex-col gap-2">
                                                    {/* Quantity stepper */}
                                                    <div className="flex items-center border border-gray-200 rounded-md overflow-hidden w-fit">
                                                        <button
                                                            onClick={() => dispatch(decreaseQuantity(item.id))}
                                                            disabled={item.quantity <= 1}
                                                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                            aria-label="Decrease quantity"
                                                        >
                                                            <FiMinus size={13} />
                                                        </button>
                                                        <div className="w-10 h-8 flex items-center justify-center text-sm font-semibold text-gray-900 border-x border-gray-200">
                                                            {item.quantity}
                                                        </div>
                                                        <button
                                                            onClick={() => dispatch(increaseQuantity(item.id))}
                                                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                                                            aria-label="Increase quantity"
                                                        >
                                                            <FiPlus size={13} />
                                                        </button>
                                                    </div>

                                                    {/* Save for later */}
                                                    <button
                                                        onClick={() => handleSaveForLater(item)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[var(--color-primary)] transition-colors w-fit"
                                                    >
                                                        <FiBookmark size={12} />
                                                        Save for later
                                                    </button>
                                                </div>

                                                {/* Line total + mobile delete */}
                                                <div className="flex items-end gap-2">
                                                    <div className="text-right">
                                                        <p className="text-[11px] text-gray-400">৳{item.price.toLocaleString()} × {item.quantity}</p>
                                                        <p className="text-base font-bold text-gray-900">৳{(item.price * item.quantity).toLocaleString()}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setDeleteConfirmId(item.id)}
                                                        className="sm:hidden w-7 h-7 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                                                        aria-label="Remove item"
                                                    >
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Continue Shopping */}
                        <div className="pt-4">
                            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-[var(--color-primary)] transition-colors">
                                <FiChevronLeft size={14} />
                                Continue Shopping
                            </Link>
                        </div>

                        {/* ═══ SAVED FOR LATER ═══ */}
                        {savedSection && (
                            <div className="mt-5">
                                {savedSection}
                            </div>
                        )}
                    </div>

                    {/* ═══ RIGHT: ORDER SUMMARY ═══ */}
                    <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit">
                        <div className="bg-white rounded-lg shadow-sm">

                            <div className="px-5 py-3.5 border-b border-gray-100">
                                <h2 className="text-sm font-semibold text-gray-900">Order Summary</h2>
                            </div>

                            {/* Coupon Input */}
                            <div className="px-5 pt-4">
                                <div className="border border-dashed border-[var(--color-primary)]/30 rounded-md p-3 bg-[var(--color-primary)]/[0.03]">
                                    <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                                        <FiTag size={12} className="text-[var(--color-primary)]" /> Apply Coupon / Voucher
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                            onKeyDown={e => e.key === 'Enter' && !appliedCoupon && handleApplyCoupon()}
                                            placeholder="Enter coupon code"
                                            disabled={!!appliedCoupon}
                                            className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded outline-none focus:border-[var(--color-primary)] bg-white disabled:bg-gray-100 disabled:text-gray-500 uppercase placeholder:normal-case placeholder:text-gray-400"
                                        />
                                        {appliedCoupon ? (
                                            <button
                                                onClick={handleRemoveCoupon}
                                                className="px-3 py-2 text-xs font-semibold text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center gap-1 flex-shrink-0"
                                            >
                                                <FiX size={12} /> Remove
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleApplyCoupon}
                                                disabled={isValidating || !couponCode.trim()}
                                                className="px-4 py-2 text-xs font-semibold bg-[var(--color-primary)] text-white rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                            >
                                                {isValidating ? '...' : 'Apply'}
                                            </button>
                                        )}
                                    </div>
                                    {couponError && (
                                        <p className="mt-1.5 text-xs text-red-500">{couponError}</p>
                                    )}
                                    {appliedCoupon && (
                                        <p className="mt-1.5 text-xs text-green-600 font-medium flex items-center gap-1">
                                            <FiCheck size={11} /> {appliedCoupon.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="px-5 py-4 space-y-2.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subtotal ({selectedQty} {selectedQty === 1 ? 'item' : 'items'})</span>
                                    <span className="text-gray-900 font-medium">৳{selectedSubtotal.toLocaleString()}</span>
                                </div>
                                {appliedCoupon && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span className="flex items-center gap-1">
                                            <FiTag size={12} />
                                            Coupon ({appliedCoupon.code})
                                        </span>
                                        {appliedCoupon.freeShipping && appliedCoupon.discount === 0 ? (
                                            <span className="font-medium">Free shipping</span>
                                        ) : (
                                            <span className="font-medium">-৳{appliedCoupon.discount.toLocaleString()}</span>
                                        )}
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">
                                        Delivery (estimated)
                                        <span className="block text-xs text-gray-400">Final cost calculated at checkout</span>
                                    </span>
                                    {freeShipping ? (
                                        <span className="font-medium text-green-600">FREE</span>
                                    ) : (
                                        <span className="text-gray-900 font-medium">৳{shippingCost.toLocaleString()}</span>
                                    )}
                                </div>
                                {remainingForFree > 0 && (
                                    <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-2.5 py-1.5 flex items-center gap-1.5">
                                        🚚 Add <span className="font-bold">৳{remainingForFree.toLocaleString()}</span> more for FREE shipping
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
                                    <span className="text-sm font-semibold text-gray-900">Total</span>
                                    <div className="text-right">
                                        {appliedCoupon && (
                                            <p className="text-xs line-through text-gray-400">৳{(selectedSubtotal + shippingCost).toLocaleString()}</p>
                                        )}
                                        <span className="text-xl font-bold text-[var(--color-primary)]">৳{finalTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Proceed to Checkout */}
                            <div className="px-5 pb-5">
                                {hasVariantIssues && (
                                    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                        <FiAlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                        <span>
                                            {incompleteSelected.length} selected item{incompleteSelected.length > 1 ? 's need' : ' needs'} a color/size choice before checkout.
                                        </span>
                                    </div>
                                )}
                                {!canCheckout ? (
                                    <button disabled className="w-full flex items-center justify-center gap-2 py-3 bg-gray-200 text-gray-400 rounded-md text-sm font-semibold cursor-not-allowed">
                                        {hasVariantIssues ? 'Select Variations to Continue' : 'Proceed to Checkout (0)'}
                                    </button>
                                ) : (
                                    <Link
                                        href="/checkout"
                                        onClick={goCheckout}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                                    >
                                        Proceed to Checkout ({selectedIds.length})
                                        <FiChevronRight size={16} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ MOBILE STICKY CHECKOUT BAR ═══ */}
            <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <div className="min-w-0">
                    <p className="text-[11px] text-gray-500">Total</p>
                    <p className="text-lg font-bold text-[var(--color-primary)] leading-none">৳{finalTotal.toLocaleString()}</p>
                </div>
                {!canCheckout ? (
                    <button disabled className="flex items-center justify-center gap-1.5 px-6 py-3 bg-gray-200 text-gray-400 rounded-md text-sm font-semibold flex-shrink-0 cursor-not-allowed">
                        {hasVariantIssues ? 'Select Variations' : 'Checkout (0)'}
                    </button>
                ) : (
                    <Link
                        href="/checkout"
                        onClick={goCheckout}
                        className="flex items-center justify-center gap-1.5 px-6 py-3 bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
                    >
                        Checkout ({selectedIds.length})
                        <FiChevronRight size={16} />
                    </Link>
                )}
            </div>

            {/* ═══ DELETE CONFIRMATION MODAL ═══ */}
            {deleteConfirmId && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
                    onClick={() => setDeleteConfirmId(null)}
                >
                    <div
                        className="bg-white rounded-lg p-6 max-w-sm w-full text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <FiAlertTriangle size={22} className="text-red-500" />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1.5">Remove Item?</h3>
                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                            Are you sure you want to remove this item from your cart?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 py-2.5 rounded border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Keep It
                            </button>
                            <button
                                onClick={() => {
                                    dispatch(removeFromCart(deleteConfirmId));
                                    toast.success('Item removed');
                                    setDeleteConfirmId(null);
                                }}
                                className="flex-1 py-2.5 rounded bg-red-500 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;

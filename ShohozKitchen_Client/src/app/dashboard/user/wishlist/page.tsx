"use client";

import React from 'react';
import Link from 'next/link';
import {
    FiHeart,
    FiShoppingCart,
    FiTrash2,
    FiStar,
    FiEye,
    FiShoppingBag,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useGetWishlistQuery, useToggleWishlistMutation } from '@/redux/api/userApi';
import { useAppDispatch } from '@/redux/hooks';
import { addToCart } from '@/redux/slices/cartSlice';

export default function WishlistPage() {
    const { data, isLoading } = useGetWishlistQuery({});
    const [toggleWishlist, { isLoading: toggling }] = useToggleWishlistMutation();
    const dispatch = useAppDispatch();

    const wishlistItems = data?.data || [];

    const handleRemove = async (productId: string) => {
        try {
            await toggleWishlist(productId).unwrap();
        } catch (err) {
            console.error('Failed to remove from wishlist', err);
        }
    };

    const handleAddToCart = (product: any) => {
        if (product.stock <= 0) { toast.error('This product is out of stock'); return; }
        dispatch(addToCart({
            id: product._id,
            productId: product._id,
            name: product.name,
            price: product.discountPrice || product.price,
            mrp: product.price,
            image: product.images?.[0] || '',
            category: 'General',
        }));
        toast.success('Added to cart');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Wishlist &amp; Followed Stores</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {wishlistItems.length} saved item{wishlistItems.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Link
                        href="/"
                        className="w-full sm:w-auto text-center whitespace-nowrap flex-shrink-0 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-all shadow-md shadow-[var(--color-primary)]/20"
                    >
                        Continue Shopping
                    </Link>
                </div>
            </div>

            {/* Wishlist Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                            <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : wishlistItems.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center shadow-sm">
                    <FiHeart size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 mb-1">Your wishlist is empty</h3>
                    <p className="text-sm text-gray-400 mb-4">Save items you love to your wishlist</p>
                    <Link
                        href="/"
                        className="inline-block px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-all shadow-md"
                    >
                        Explore Products
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wishlistItems.map((product: any) => (
                        <div key={product._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            {/* Image */}
                            <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
                                {product.images?.[0] ? (
                                    <img
                                        src={product.images[0]}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                                        <FiShoppingCart size={32} />
                                    </div>
                                )}

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                    <Link
                                        href={`/product/${product.slug || product._id}`}
                                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-[var(--color-primary)] hover:text-white transition-all"
                                    >
                                        <FiEye size={16} />
                                    </Link>
                                    <button
                                        onClick={() => handleAddToCart(product)}
                                        disabled={product.stock <= 0}
                                        title={product.stock > 0 ? 'Add to cart' : 'Out of stock'}
                                        className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg hover:bg-[var(--color-primary)] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <FiShoppingCart size={16} />
                                    </button>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => handleRemove(product._id)}
                                    disabled={toggling}
                                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                >
                                    <FiTrash2 size={14} />
                                </button>

                                {/* Discount Badge */}
                                {product.discountPrice && product.discountPrice < product.price && (
                                    <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded-md shadow-md">
                                        -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="p-4">
                                <Link href={`/product/${product.slug || product._id}`}>
                                    <h3 className="text-sm font-bold text-gray-800 hover:text-[var(--color-primary)] transition-colors line-clamp-2">
                                        {product.name}
                                    </h3>
                                </Link>

                                {/* Rating */}
                                {product.averageRating > 0 && (
                                    <div className="flex items-center gap-1 mt-2">
                                        <FiStar size={12} className="text-amber-400 fill-amber-400" />
                                        <span className="text-xs font-semibold text-gray-600">
                                            {product.averageRating?.toFixed(1)}
                                        </span>
                                        <span className="text-xs text-gray-300">
                                            ({product.totalReviews || 0})
                                        </span>
                                    </div>
                                )}

                                {/* Price */}
                                <div className="flex items-center gap-2 mt-3">
                                    <span className="text-lg font-bold text-[var(--color-primary)]">
                                        ৳{(product.discountPrice || product.price)?.toLocaleString()}
                                    </span>
                                    {product.discountPrice && product.discountPrice < product.price && (
                                        <span className="text-xs text-gray-400 line-through">
                                            ৳{product.price?.toLocaleString()}
                                        </span>
                                    )}
                                </div>

                                {/* Stock */}
                                <p className={`text-xs font-bold mt-2 ${product.stock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Followed Stores ── */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <FiShoppingBag size={18} className="text-[var(--color-primary)]" />
                    <h2 className="text-lg font-bold text-gray-900">Followed Stores</h2>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm text-center">
                    <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                        <FiShoppingBag size={24} className="text-[var(--color-primary)]" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700 mb-1">You&apos;re not following any stores yet</h3>
                    <p className="text-sm text-gray-400 mb-5 max-w-md mx-auto">
                        Follow your favourite stores to get their latest products and offers right here.
                    </p>
                    <Link
                        href="/products"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:brightness-95 transition-all"
                    >
                        <FiShoppingBag size={15} /> Browse Stores
                    </Link>
                </div>
            </div>
        </div>
    );
}

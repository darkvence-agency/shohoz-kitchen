"use client";

import React, { useState } from 'react';
import Link from 'next/link';

import {
    useGetProductReviewsQuery,
    usePublicCreateReviewMutation,
    useLikeReviewMutation,
    useReplyToReviewMutation,
    useLikeReplyMutation,
} from '@/redux/api/reviewApi';
import { useToggleWishlistMutation, useGetWishlistQuery } from '@/redux/api/userApi';
import { useAppDispatch, useAppSelector } from '@/redux';
import { addToCart } from '@/redux/slices/cartSlice';
import { toggleWishlist } from '@/redux/slices/wishlistSlice';
import { FiStar, FiX, FiCopy, FiCheck, FiSend, FiThumbsUp, FiCornerDownRight, FiHeart } from 'react-icons/fi';
import { getDisplayPrice } from '@/utils/offerPrice';

interface Product {
    _id?: string;
    id: string | number;
    slug?: string;
    name: string;
    image: string;
    price: number;
    originalPrice?: number;
    mrp?: number;
    discount?: number | string;
    offerStartDate?: string | Date | null;
    offerEndDate?: string | Date | null;
    rating?: number;
    reviews?: number;
    categoryName?: string;
    warranty?: string;
    priceType?: 'negotiable' | 'fixed';
    sold?: number;
    soldCount?: number;
    totalSold?: number;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    viewCount?: number;
    reviewCount?: number;
}

interface NewProductCardProps {
    product: Product;
}

const formatCount = (n: number): string => {
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'K';
    return String(n);
};

const NewProductCard: React.FC<NewProductCardProps> = ({ product }) => {

    const [toggleWishlistApi] = useToggleWishlistMutation();
    const dispatch = useAppDispatch();
    const productId = String(product._id || product.id);

    // Auth + cart state
    const { isAuthenticated } = useAppSelector((state: any) => state.auth);
    const cartItems = useAppSelector((state: any) => state.cart.items);
    const isInCart = cartItems.some((item: any) => item.id === productId);

    // Wishlist state — server for logged-in users, Redux for guests
    const localWishlist = useAppSelector((state: any) => state.wishlist.items);
    const { data: serverWishlist } = useGetWishlistQuery({}, { skip: !isAuthenticated });
    const serverItems: any[] = serverWishlist?.data || [];
    const isInWishlist = isAuthenticated
        ? serverItems.some((item: any) => String(item._id || item.id) === productId)
        : localWishlist.some((item: any) => item.id === productId);
    const [wishlistAnim, setWishlistAnim] = useState(false);
    const [showAlreadyAdded, setShowAlreadyAdded] = useState(false);



    const handleWishlistToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setWishlistAnim(true);
        setTimeout(() => setWishlistAnim(false), 400);
        if (isAuthenticated) {
            try {
                await toggleWishlistApi(productId).unwrap();
            } catch (err) {
                console.error('Wishlist toggle failed:', err);
            }
        } else {
            dispatch(toggleWishlist({
                id: productId,
                name: product.name,
                price: product.price,
                mrp: product.originalPrice || product.mrp || product.price,
                image: product.image,
                category: product.categoryName || '',
                rating: product.rating || 0,
            }));
        }
    };

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isInCart) {
            setShowAlreadyAdded(true);
            setTimeout(() => setShowAlreadyAdded(false), 1500);
            return;
        }
        dispatch(addToCart({
            id: productId,
            productId: productId,
            name: product.name,
            price: product.price,
            mrp: product.originalPrice || product.mrp || product.price,
            image: product.image,
            category: product.categoryName || 'General',
        }));
    };

    // Respect the offer-validity window: while the offer is active the card shows
    // the offer price + discount; once it expires (or before it starts) it falls
    // back to the regular price with no discount badge. With no offer dates the
    // result is unchanged from before (offerActive = true).
    const display = getDisplayPrice({
        price: product.price,
        originalPrice: product.originalPrice ?? product.mrp ?? undefined,
        discount: typeof product.discount === 'string' ? Number(product.discount) || 0 : (product.discount ?? 0),
        offerStartDate: product.offerStartDate,
        offerEndDate: product.offerEndDate,
    });
    const currentPrice = display.currentPrice;
    const oldPrice = display.originalPrice;
    const discountPercent = display.offerActive && oldPrice && oldPrice > currentPrice
        ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100)
        : 0;
    const soldCount = product.sold || product.soldCount || product.totalSold || 0;

    return (
        <>
            <div className='bg-white border border-gray-200 overflow-hidden hover:border-[var(--color-primary)]/40 hover:shadow-md hover:shadow-slate-900/5 transition-all duration-300 group'>
            <Link href={`/product/${product.slug || product.id}`}>
                <div>

                    {/* Product Image */}
                    <div className='aspect-square bg-slate-50 overflow-hidden relative'>
                        {/* Discount badge */}
                        {discountPercent > 0 && (
                            <span className='absolute top-2 left-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm shadow-sm'>
                                -{discountPercent}%
                            </span>
                        )}
                        {/* Cart Button — hidden, slides in on card hover */}
                        <button
                            onClick={handleAddToCart}
                            className='absolute top-2 right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md border border-slate-100 text-slate-700 transition-all duration-200 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 hover:scale-110 bg-white hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)]'
                            title={isInCart ? 'Already in Cart' : 'Add to Cart'}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                            {isInCart && <span className='absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full ring-2 ring-white' />}
                        </button>
                        {/* Wishlist Button — hidden, slides in on card hover (slight delay) */}
                        <button
                            onClick={handleWishlistToggle}
                            className={`absolute top-[46px] right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md border transition-all duration-200 delay-75 hover:scale-110 bg-white hover:bg-red-500 hover:border-red-500 ${isInWishlist ? 'opacity-100 translate-x-0 border-red-200' : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 border-slate-100'} ${wishlistAnim ? 'scale-125' : ''}`}
                            title={isInWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                        >
                            <FiHeart
                                size={13}
                                className={`transition-colors ${isInWishlist ? 'text-red-500' : 'text-slate-600 hover:text-white'}`}
                                style={{ fill: isInWishlist ? 'currentColor' : 'none' }}
                            />
                        </button>
                        <img
                            src={product.image || 'https://via.placeholder.com/400x400/F1F5F9/CBD5E1?text=Product'}
                            alt={product.name}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-500'
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400/F1F5F9/CBD5E1?text=Product';
                            }}
                        />
                    </div>

                    {/* Product Info — Daraz-style */}
                    <div className='px-2.5 py-2'>
                        {/* Product Name — 2 lines like Daraz */}
                        <h3 className='text-[13px] text-slate-800 font-normal line-clamp-2 leading-snug min-h-[2.4em] group-hover:text-[var(--color-primary)] transition-colors'>
                            {product.name}
                        </h3>

                        {/* Price */}
                        <div className='flex items-baseline gap-1.5 mt-1'>
                            <span className='text-[15px] font-bold' style={{ color: 'var(--color-sale)' }}>৳{currentPrice.toLocaleString()}</span>
                            {oldPrice && oldPrice > currentPrice && (
                                <span className='text-[11px] line-through text-slate-400'>৳{oldPrice.toLocaleString()}</span>
                            )}
                            {discountPercent > 0 && (
                                <span className='text-[11px] font-semibold' style={{ color: 'var(--color-sale)' }}>-{discountPercent}%</span>
                            )}
                        </div>

                        {/* Rating + sold — Daraz feed line */}
                        {((product.rating || 0) > 0 || soldCount > 0) && (
                            <div className='flex items-center gap-1.5 mt-1 text-[10px] text-slate-400'>
                                {(product.rating || 0) > 0 && (
                                    <span className='flex items-center gap-0.5'>
                                        <FiStar size={10} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                        <span className='text-slate-500 font-medium'>{Number(product.rating).toFixed(1)}</span>
                                    </span>
                                )}
                                {(product.rating || 0) > 0 && soldCount > 0 && <span className='text-slate-300'>|</span>}
                                {soldCount > 0 && <span>{formatCount(soldCount)} sold</span>}
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            </div>

        </>
    );
};


/* ═══════════════════════════════════════════════ */
/* ═══ COMMENTS POPUP — with write comment ═══ */
/* ═══════════════════════════════════════════════ */

// localStorage helpers — track which reviews/replies this device has liked
const LIKED_REVIEWS_KEY = 'shohozkitchen_liked_reviews';
const LIKED_REPLIES_KEY = 'shohozkitchen_liked_replies';

const getLikedSet = (key: string): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(key);
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
};
const addToLikedSet = (key: string, id: string) => {
    if (typeof window === 'undefined') return;
    const set = getLikedSet(key);
    set.add(id);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
};

const CommentsPopup: React.FC<{
    productId: string;
    productName: string;
    productImage: string;
    onClose: () => void;
}> = ({ productId, productName, productImage, onClose }) => {
    const { data: reviewsData, isLoading } = useGetProductReviewsQuery({ productId });
    const [publicCreateReview] = usePublicCreateReviewMutation();
    const [likeReview] = useLikeReviewMutation();
    const [replyToReview] = useReplyToReviewMutation();
    const [likeReply] = useLikeReplyMutation();
    const reviews = reviewsData?.data || [];

    const [newComment, setNewComment] = useState('');
    const [newRating, setNewRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Like tracking (per-device via localStorage)
    const [likedReviews, setLikedReviews] = useState<Set<string>>(() => getLikedSet(LIKED_REVIEWS_KEY));
    const [likedReplies, setLikedReplies] = useState<Set<string>>(() => getLikedSet(LIKED_REPLIES_KEY));

    // Reply UI state — which review has reply box open + text
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const handleSubmitComment = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        try {
            await publicCreateReview({
                product: productId,
                rating: newRating,
                comment: newComment.trim(),
                userName: 'Anonymous'
            }).unwrap();
            setNewComment('');
            setNewRating(5);
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to submit review:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLikeReview = async (reviewId: string) => {
        if (likedReviews.has(reviewId)) return;
        addToLikedSet(LIKED_REVIEWS_KEY, reviewId);
        setLikedReviews(prev => new Set(prev).add(reviewId));
        try { await likeReview(reviewId).unwrap(); } catch (e) { console.error(e); }
    };

    const handleLikeReply = async (reviewId: string, replyId: string) => {
        const key = `${reviewId}_${replyId}`;
        if (likedReplies.has(key)) return;
        addToLikedSet(LIKED_REPLIES_KEY, key);
        setLikedReplies(prev => new Set(prev).add(key));
        try { await likeReply({ reviewId, replyId }).unwrap(); } catch (e) { console.error(e); }
    };

    const handleSubmitReply = async (reviewId: string) => {
        const text = replyText.trim();
        if (!text) return;
        setIsReplying(true);
        try {
            await replyToReview({ reviewId, text, userName: 'Anonymous' }).unwrap();
            setReplyText('');
            setReplyingTo(null);
        } catch (e) { console.error(e); }
        finally { setIsReplying(false); }
    };

    return (
        <div
            className='fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4'
            onClick={onClose}
        >
            <div
                className='bg-white rounded-lg w-full max-w-[620px] max-h-[88vh] flex flex-col overflow-hidden shadow-2xl'
                onClick={(e) => e.stopPropagation()}
                style={{ animation: 'fbModalIn 0.2s ease-out' }}
            >
                {/* ── Header ── */}
                <div className='flex items-center justify-between px-4 py-2.5 border-b border-gray-200 shrink-0'>
                    <h3 className='text-[15px] font-bold text-gray-900 truncate pr-4'>{productName}</h3>
                    <button
                        onClick={onClose}
                        className='w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors shrink-0'
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* ── Product image — full view ── */}
                <div className='shrink-0 border-b border-gray-200'>
                    <div className='w-full bg-gray-50 flex items-center justify-center' style={{ maxHeight: '280px' }}>
                        <img
                            src={productImage}
                            alt={productName}
                            className='w-full object-contain'
                            style={{ maxHeight: '280px' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/620x200/f3f4f6/9ca3af?text=No+Image';
                            }}
                        />
                    </div>
                    {/* Stats bar */}
                    <div className='flex items-center justify-between px-4 py-1.5 text-xs text-gray-500'>
                        <span>{reviews.length} {reviews.length === 1 ? 'Comment' : 'Comments'}</span>
                    </div>
                </div>

                {/* ── Comments List — scrollable ── */}
                <div className='flex-1 overflow-y-auto px-4 py-2 space-y-2.5' style={{ minHeight: '60px' }}>
                    {isLoading ? (
                        <div className='flex items-center justify-center py-8'>
                            <div className='w-6 h-6 border-2 border-gray-200 border-t-[var(--color-primary)] rounded-full animate-spin' />
                        </div>
                    ) : reviews.length > 0 ? (
                        <>
                            <p className='text-[11px] font-semibold text-gray-400 uppercase tracking-wide'>Most relevant</p>
                            {reviews.map((review: any) => {
                                const reviewId = review._id;
                                const isLiked = likedReviews.has(reviewId);
                                const likeCount = review.likes || 0;
                                const replies = review.replies || [];
                                const isReplyOpen = replyingTo === reviewId;

                                return (
                                    <div key={reviewId} className='flex gap-2'>
                                        <div className='flex-1 min-w-0'>
                                            <div className='bg-gray-100 rounded-2xl px-3 py-2'>
                                                {review.comment && (
                                                    <p className='text-[12px] text-gray-800 leading-snug'>{review.comment}</p>
                                                )}
                                            </div>
                                            <div className='flex items-center gap-3 px-3 mt-0.5 text-[10px] text-gray-400'>
                                                <span className='flex gap-0.5'>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <FiStar key={star} size={9} style={{
                                                            color: '#f59e0b',
                                                            fill: star <= (review.rating || 0) ? '#f59e0b' : 'none'
                                                        }} />
                                                    ))}
                                                </span>
                                                <button
                                                    onClick={() => handleLikeReview(reviewId)}
                                                    className={`font-medium hover:underline flex items-center gap-1 ${isLiked ? 'text-[var(--color-secondary)]' : ''}`}
                                                    disabled={isLiked}
                                                >
                                                    <FiThumbsUp size={10} style={{ fill: isLiked ? 'var(--color-secondary)' : 'none' }} />
                                                    <span>Like{likeCount > 0 ? ` (${likeCount})` : ''}</span>
                                                </button>
                                                <button
                                                    onClick={() => { setReplyingTo(isReplyOpen ? null : reviewId); setReplyText(''); }}
                                                    className='font-medium hover:underline'
                                                >
                                                    Reply{replies.length > 0 ? ` (${replies.length})` : ''}
                                                </button>
                                            </div>

                                            {/* ── Replies list ── */}
                                            {replies.length > 0 && (
                                                <div className='mt-1.5 ml-1 space-y-1.5'>
                                                    {replies.map((reply: any) => {
                                                        const replyKey = `${reviewId}_${reply._id}`;
                                                        const isReplyLiked = likedReplies.has(replyKey);
                                                        return (
                                                            <div key={reply._id} className='flex gap-2'>
                                                                <FiCornerDownRight size={12} className='text-gray-300 mt-1.5 shrink-0' />
                                                                <div className='flex-1 min-w-0'>
                                                                    <div className='bg-gray-50 rounded-2xl px-3 py-1.5'>
                                                                        <p className='text-[11px] text-gray-800 leading-snug'>{reply.text}</p>
                                                                    </div>
                                                                    <div className='flex items-center gap-3 px-3 mt-0.5 text-[10px] text-gray-400'>
                                                                        <button
                                                                            onClick={() => handleLikeReply(reviewId, reply._id)}
                                                                            className={`font-medium hover:underline flex items-center gap-1 ${isReplyLiked ? 'text-[var(--color-secondary)]' : ''}`}
                                                                            disabled={isReplyLiked}
                                                                        >
                                                                            <FiThumbsUp size={9} style={{ fill: isReplyLiked ? 'var(--color-secondary)' : 'none' }} />
                                                                            <span>Like{reply.likes > 0 ? ` (${reply.likes})` : ''}</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* ── Reply input ── */}
                                            {isReplyOpen && (
                                                <div className='flex gap-2 mt-2 ml-1'>
                                                    <FiCornerDownRight size={12} className='text-gray-300 mt-2 shrink-0' />
                                                    <div className='flex-1 flex items-center bg-gray-100 rounded-full px-3 py-1'>
                                                        <input
                                                            type='text'
                                                            autoFocus
                                                            value={replyText}
                                                            onChange={e => setReplyText(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) handleSubmitReply(reviewId); }}
                                                            placeholder='Write a reply...'
                                                            className='flex-1 bg-transparent text-[11px] text-gray-700 outline-none'
                                                        />
                                                        <button
                                                            onClick={() => handleSubmitReply(reviewId)}
                                                            disabled={!replyText.trim() || isReplying}
                                                            className='text-[var(--color-primary)] font-semibold text-[11px] ml-2 disabled:opacity-30 flex items-center gap-1'
                                                        >
                                                            {isReplying ? (
                                                                <div className='w-3 h-3 border-2 border-gray-300 border-t-[var(--color-primary)] rounded-full animate-spin' />
                                                            ) : (
                                                                <FiSend size={11} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className='text-center py-6'>
                            <p className='text-sm text-gray-500'>No comments yet</p>
                            <p className='text-xs text-gray-400 mt-1'>Be the first to comment!</p>
                        </div>
                    )}
                </div>

                {/* ── Comment Input — bottom bar ── */}
                <div className='border-t border-gray-200 px-4 py-2.5 shrink-0 bg-white'>
                    {submitSuccess && (
                        <div className='mb-2 text-center text-xs text-green-600 font-medium bg-green-50 py-1.5 rounded-lg'>
                            ✅ Comment posted!
                        </div>
                    )}

                    <div className='flex items-start gap-2.5'>
                        {/* Comment + Rating */}
                        <div className='flex-1 min-w-0 bg-gray-100 rounded-2xl px-3 py-1.5'>
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && newComment.trim()) handleSubmitComment(); }}
                                placeholder="Write a comment..."
                                className='w-full bg-transparent text-[12px] text-gray-700 font-normal placeholder-gray-400 placeholder:font-normal outline-none py-1'
                            />
                            {/* Rating + Send row */}
                            <div className='flex items-center justify-between mt-1 pt-1.5 border-t border-gray-200/60'>
                                <div className='flex items-center gap-1.5'>
                                    <span className='text-[11px] text-gray-400'>Rating</span>
                                    <div className='flex gap-px'>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <button
                                                key={star}
                                                onClick={() => setNewRating(star)}
                                                onMouseEnter={() => setHoverRating(star)}
                                                onMouseLeave={() => setHoverRating(0)}
                                                className='p-px transition-transform hover:scale-125'
                                            >
                                                <FiStar size={13} style={{
                                                    color: '#f59e0b',
                                                    fill: star <= (hoverRating || newRating) ? '#f59e0b' : 'none',
                                                    transition: 'all 0.15s ease'
                                                }} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <button
                                    onClick={handleSubmitComment}
                                    disabled={!newComment.trim() || isSubmitting}
                                    className='text-[var(--color-primary)] font-semibold text-[13px] hover:text-[var(--color-primary-dark)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1'
                                >
                                    {isSubmitting ? (
                                        <div className='w-4 h-4 border-2 border-gray-300 border-t-[var(--color-primary)] rounded-full animate-spin' />
                                    ) : (
                                        <><FiSend size={13} /> Post</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fbModalIn {
                    from { transform: scale(0.95) translateY(10px); opacity: 0; }
                    to { transform: scale(1) translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export { CommentsPopup };
export default NewProductCard;

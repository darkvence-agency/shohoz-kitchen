"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FiStar, FiEdit2, FiTrash2, FiPackage, FiX, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useGetMyReviewsQuery, useCreateReviewMutation, useUpdateReviewMutation, useDeleteReviewMutation } from '@/redux/api/reviewApi';
import { useGetMyOrdersQuery } from '@/redux/api/orderApi';

// ── Read-only star row ──
const Stars = ({ value, size = 14 }: { value: number; size?: number }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
            <FiStar key={s} size={size} className={s <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
        ))}
    </div>
);

type Composer = { open: boolean; productId: string; name: string; thumbnail?: string; rating: number; comment: string; editId?: string };
const EMPTY: Composer = { open: false, productId: '', name: '', thumbnail: '', rating: 5, comment: '', editId: undefined };

export default function MyReviewsPage() {
    const [tab, setTab] = useState<'toReview' | 'history'>('toReview');
    const [composer, setComposer] = useState<Composer>(EMPTY);
    const [hoverRating, setHoverRating] = useState(0);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const { data: myReviewsData, isLoading: reviewsLoading } = useGetMyReviewsQuery({ limit: 100 });
    const { data: deliveredData, isLoading: deliveredLoading } = useGetMyOrdersQuery({ status: 'delivered', limit: 100 });

    const [createReview, { isLoading: creating }] = useCreateReviewMutation();
    const [updateReview, { isLoading: updating }] = useUpdateReviewMutation();
    const [deleteReview] = useDeleteReviewMutation();

    const myReviews: any[] = myReviewsData?.data || [];

    // Products already reviewed (so they drop out of "To Review")
    const reviewedIds = useMemo(
        () => new Set(myReviews.map(r => (r.product?._id || r.product)?.toString()).filter(Boolean)),
        [myReviews]
    );

    // "To Review" = unique products from delivered orders not yet reviewed
    const toReview = useMemo(() => {
        const map = new Map<string, any>();
        (deliveredData?.data || []).forEach((o: any) => {
            (o.items || []).forEach((it: any) => {
                const pid = (it.product?._id || it.product)?.toString();
                if (!pid || reviewedIds.has(pid) || map.has(pid)) return;
                map.set(pid, {
                    productId: pid,
                    name: it.product?.name || it.name || 'Product',
                    thumbnail: it.product?.thumbnail || it.thumbnail || it.image,
                    slug: it.product?.slug,
                });
            });
        });
        return Array.from(map.values());
    }, [deliveredData, reviewedIds]);

    const openWrite = (p: { productId: string; name: string; thumbnail?: string }) =>
        setComposer({ open: true, productId: p.productId, name: p.name, thumbnail: p.thumbnail, rating: 5, comment: '', editId: undefined });

    const openEdit = (r: any) =>
        setComposer({ open: true, productId: (r.product?._id || r.product)?.toString(), name: r.product?.name || 'Product', thumbnail: r.product?.thumbnail, rating: r.rating, comment: r.comment || '', editId: r._id });

    const submit = async () => {
        if (!composer.comment.trim()) { toast.error('Please write a few words about the product'); return; }
        try {
            if (composer.editId) {
                await updateReview({ id: composer.editId, rating: composer.rating, comment: composer.comment.trim() }).unwrap();
                toast.success('Review updated');
            } else {
                await createReview({ product: composer.productId, rating: composer.rating, comment: composer.comment.trim() }).unwrap();
                toast.success('Thanks for your review!');
            }
            setComposer(EMPTY);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Could not save your review');
        }
    };

    const remove = async (id: string) => {
        try {
            await deleteReview(id).unwrap();
            toast.success('Review removed');
            setConfirmDelete(null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Could not delete review');
        }
    };

    const TabBtn = ({ id, label, count }: { id: 'toReview' | 'history'; label: string; count: number }) => (
        <button
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${
                tab === id ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
            {label}
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${tab === id ? 'bg-white/25' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
        </button>
    );

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
                <p className="text-sm text-gray-400 mt-1">Rate the products you&apos;ve received and manage your reviews</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm flex gap-2">
                <TabBtn id="toReview" label="To Review" count={toReview.length} />
                <TabBtn id="history" label="My Reviews" count={myReviews.length} />
            </div>

            {/* ── To Review ── */}
            {tab === 'toReview' && (
                deliveredLoading ? (
                    <SkeletonList />
                ) : toReview.length === 0 ? (
                    <EmptyBox icon={<FiCheckCircle size={44} className="mx-auto text-emerald-300 mb-3" />} title="You're all caught up!" text="Products from your delivered orders will appear here when they're ready to review." />
                ) : (
                    <div className="space-y-3">
                        {toReview.map(p => (
                            <div key={p.productId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 sm:gap-4">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                    {p.thumbnail ? <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" /> : <FiPackage size={20} className="text-gray-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link href={p.slug ? `/product/${p.slug}` : '#'} className="text-sm font-semibold text-gray-800 hover:text-[var(--color-primary)] line-clamp-2">{p.name}</Link>
                                    <p className="text-xs text-emerald-500 font-semibold mt-1">Delivered · ready to review</p>
                                </div>
                                <button onClick={() => openWrite(p)} className="px-3 sm:px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:brightness-95 transition-all flex items-center gap-1.5 flex-shrink-0">
                                    <FiStar size={14} /> <span className="hidden sm:inline">Write a </span>Review
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── My Reviews (history) ── */}
            {tab === 'history' && (
                reviewsLoading ? (
                    <SkeletonList />
                ) : myReviews.length === 0 ? (
                    <EmptyBox icon={<FiStar size={44} className="mx-auto text-gray-200 mb-3" />} title="No reviews yet" text="Once you review a product, it will show up here." />
                ) : (
                    <div className="space-y-3">
                        {myReviews.map(r => (
                            <div key={r._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        {r.product?.thumbnail ? <img src={r.product.thumbnail} alt={r.product?.name} className="w-full h-full object-cover" /> : <FiPackage size={18} className="text-gray-300" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <Link href={r.product?.slug ? `/product/${r.product.slug}` : '#'} className="text-sm font-semibold text-gray-800 hover:text-[var(--color-primary)] line-clamp-1">{r.product?.name || 'Product'}</Link>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Stars value={r.rating} />
                                            <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        {r.comment && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.comment}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button onClick={() => openEdit(r)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all" aria-label="Edit review"><FiEdit2 size={15} /></button>
                                        <button onClick={() => setConfirmDelete(r._id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" aria-label="Delete review"><FiTrash2 size={15} /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Composer Modal ── */}
            {composer.open && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4" onClick={() => setComposer(EMPTY)}>
                    <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">{composer.editId ? 'Edit your review' : 'Write a review'}</h3>
                            <button onClick={() => setComposer(EMPTY)} className="text-gray-400 hover:text-gray-700"><FiX size={20} /></button>
                        </div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {composer.thumbnail ? <img src={composer.thumbnail} alt={composer.name} className="w-full h-full object-cover" /> : <FiPackage size={18} className="text-gray-300" />}
                            </div>
                            <p className="text-sm font-semibold text-gray-700 line-clamp-2">{composer.name}</p>
                        </div>
                        {/* Star picker */}
                        <div className="flex items-center gap-1.5 mb-4">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setComposer(c => ({ ...c, rating: s }))}>
                                    <FiStar size={28} className={s <= (hoverRating || composer.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                                </button>
                            ))}
                            <span className="ml-2 text-sm font-semibold text-gray-500">{composer.rating}.0</span>
                        </div>
                        <textarea
                            value={composer.comment}
                            onChange={e => setComposer(c => ({ ...c, comment: e.target.value }))}
                            placeholder="Share your experience with this product…"
                            rows={4}
                            maxLength={1000}
                            className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-[var(--color-primary)] resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => setComposer(EMPTY)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                            <button onClick={submit} disabled={creating || updating} className="flex-1 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-95 disabled:opacity-60">
                                {creating || updating ? 'Saving…' : composer.editId ? 'Update Review' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete confirm ── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4" onClick={() => setConfirmDelete(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4"><FiTrash2 size={20} className="text-red-500" /></div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">Delete this review?</h3>
                        <p className="text-sm text-gray-500 mb-5">This can&apos;t be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Keep</button>
                            <button onClick={() => remove(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const SkeletonList = () => (
    <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-2/3" /><div className="h-3 bg-gray-100 rounded w-1/3" /></div>
            </div>
        ))}
    </div>
);

const EmptyBox = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
        {icon}
        <h3 className="text-lg font-bold text-gray-600 mb-1">{title}</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">{text}</p>
    </div>
);

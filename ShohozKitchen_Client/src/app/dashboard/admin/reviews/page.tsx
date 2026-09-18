"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import {
    FiStar,
    FiMessageSquare,
    FiCheckCircle,
    FiXCircle,
    FiTrash2,
    FiRefreshCw,
    FiFilter,
    FiSearch,
    FiCornerDownRight,
    FiSend,
    FiEye,
    FiAlertCircle,
    FiUser,
    FiPackage,
    FiX,
    FiClock,
} from 'react-icons/fi';
import {
    useGetAllReviewsQuery,
    useUpdateReviewMutation,
    useDeleteReviewMutation,
} from '@/redux/api/reviewApi';
import toast from 'react-hot-toast';

// Reply Modal
const ReplyModal = ({
    isOpen,
    onClose,
    onSubmit,
    review
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reply: string) => void;
    review: any;
}) => {
    const [reply, setReply] = useState(review?.adminReply || '');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-md shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">Reply to Review</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Reviewer's Comment</p>
                        <p className="text-sm text-blue-900 italic">"{review?.comment}"</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Your Response</label>
                        <textarea
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium h-32 resize-none text-sm"
                            placeholder="Type your reply here..."
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                        />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={() => onSubmit(reply)}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] flex items-center gap-2 transition-all"
                    >
                        <FiSend size={16} />
                        Send Reply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function ReviewsPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState<any>(null);

    const { data: reviewsData, isLoading, refetch } = useGetAllReviewsQuery({ page, limit: 10, status: statusFilter });

    const [updateReview] = useUpdateReviewMutation();
    const [deleteReview] = useDeleteReviewMutation();

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await updateReview({ id, status }).unwrap();
            toast.success(`Review ${status}`);
        } catch (err: any) {
            toast.error(err.data?.message || 'Update failed');
        }
    };

    const handleReplySubmit = async (reply: string) => {
        if (!reply.trim()) return toast.error('Reply cannot be empty');
        try {
            await updateReview({ id: selectedReview._id, adminReply: reply }).unwrap();
            toast.success('Reply added');
            setIsReplyModalOpen(false);
        } catch (err: any) {
            toast.error(err.data?.message || 'Failed to add reply');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return;
        try {
            await deleteReview(id).unwrap();
            toast.success('Review deleted');
        } catch (err: any) {
            toast.error(err.data?.message || 'Delete failed');
        }
    };

    const reviews = reviewsData?.data || [];
    const meta = reviewsData?.meta || { total: 0, totalPages: 1 };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Product Reviews</h1>
                    <p className="text-gray-500 mt-1">Monitor and respond to customer feedback</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
                >
                    <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-md p-5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-md bg-white shadow-sm text-blue-600">
                        <FiMessageSquare size={22} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-600 leading-none">{meta.total}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wider">Total Reviews</p>
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/10">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Filter Status:</span>
                        <div className="flex gap-1.5">
                            {['', 'pending', 'approved', 'rejected'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border ${statusFilter === s
                                        ? 'bg-gray-800 text-white border-gray-800 shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {s || 'All'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium italic">Showing {reviews.length} of {meta.total} reviews</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User & Rating</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-[350px]">Comment</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-16 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No reviews found.</td>
                                </tr>
                            ) : (
                                reviews.map((review: any) => (
                                    <tr key={review._id} className="hover:bg-gray-50/50 align-top">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 relative overflow-hidden">
                                                    {review.product?.thumbnail && (
                                                        <Image
                                                            src={review.product.thumbnail}
                                                            alt={review.product.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    )}
                                                </div>
                                                <div className="max-w-[150px]">
                                                    <p className="text-xs font-bold text-gray-800 truncate line-clamp-1">{review.product?.name}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-mono">#{review.product?.slug}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                                        {review.user?.avatar ? (
                                                            <Image src={review.user.avatar} alt="User" width={24} height={24} className="rounded-full" />
                                                        ) : <FiUser size={12} className="text-gray-400" />}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-700">{review.user?.firstName} {review.user?.lastName}</span>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => (
                                                        <FiStar
                                                            key={i}
                                                            size={12}
                                                            className={i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
                                                {review.images && review.images.length > 0 && (
                                                    <div className="flex gap-1">
                                                        {review.images.map((img: string, idx: number) => (
                                                            <div key={idx} className="w-8 h-8 rounded border border-gray-100 relative overflow-hidden">
                                                                <Image src={img} alt="review" fill className="object-cover" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {review.adminReply && (
                                                    <div className="bg-gray-50 p-2 rounded border border-gray-200 flex gap-2">
                                                        <FiCornerDownRight className="text-gray-400 flex-shrink-0" size={14} />
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Response</p>
                                                            <p className="text-xs text-gray-700 font-medium">{review.adminReply}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${review.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                review.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                    'bg-red-50 text-red-700 border border-red-100'
                                                }`}>
                                                {review.status}
                                            </span>
                                            {review.isVerifiedPurchase && (
                                                <div className="mt-2 text-[9px] font-bold text-indigo-500 uppercase flex items-center gap-1">
                                                    <FiCheckCircle size={10} /> Verified Purchase
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {review.status !== 'approved' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(review._id, 'approved')}
                                                        title="Approve"
                                                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-md border border-gray-100 transition-all"
                                                    >
                                                        <FiCheckCircle size={16} />
                                                    </button>
                                                )}
                                                {review.status !== 'rejected' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(review._id, 'rejected')}
                                                        title="Reject"
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-md border border-gray-100 transition-all"
                                                    >
                                                        <FiXCircle size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => { setSelectedReview(review); setIsReplyModalOpen(true); }}
                                                    title="Reply"
                                                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-md border border-gray-100 transition-all"
                                                >
                                                    <FiMessageSquare size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(review._id)}
                                                    title="Delete"
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md border border-gray-100 transition-all"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination — windowed so it stays compact as reviews grow */}
                {meta.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-center items-center gap-2">
                        {(() => {
                            const items: (number | string)[] = [];
                            for (let i = 1; i <= meta.totalPages; i++) {
                                if (i === 1 || i === meta.totalPages || (i >= page - 1 && i <= page + 1)) items.push(i);
                                else if (items[items.length - 1] !== '…') items.push('…');
                            }
                            return items.map((it, idx) =>
                                it === '…' ? (
                                    <span key={`gap-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm select-none">…</span>
                                ) : (
                                    <button
                                        key={it}
                                        onClick={() => setPage(it as number)}
                                        className={`w-8 h-8 rounded-md text-sm font-bold transition-all ${page === it
                                            ? 'bg-[var(--color-primary)] text-white shadow-md'
                                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {it}
                                    </button>
                                )
                            );
                        })()}
                    </div>
                )}
            </div>

            <ReplyModal
                isOpen={isReplyModalOpen}
                onClose={() => setIsReplyModalOpen(false)}
                onSubmit={handleReplySubmit}
                review={selectedReview}
            />
        </div>
    );
}

'use client';

import { useState } from 'react';
import {
    useGetPendingProductsQuery,
    useApproveProductMutation,
    useRejectProductMutation,
} from '@/redux/api/productApi';
import toast from 'react-hot-toast';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

const STATUS_TABS: { label: string; value: ApprovalStatus | 'all' }[] = [
    { label: 'Pending', value: 'pending' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'All', value: 'all' },
];

const statusBadge = (status: ApprovalStatus) => {
    const styles: Record<ApprovalStatus, string> = {
        pending: 'bg-amber-100 text-amber-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
    };
    const icons: Record<ApprovalStatus, string> = { pending: '⏳', approved: '✅', rejected: '❌' };
    const safe = styles[status] ? status : 'pending';
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[safe]}`}>
            {icons[safe]} {safe.charAt(0).toUpperCase() + safe.slice(1)}
        </span>
    );
};

export default function AdminProductModerationPage() {
    const [activeTab, setActiveTab] = useState<ApprovalStatus | 'all'>('pending');
    const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    const { data, isLoading, refetch } = useGetPendingProductsQuery({
        status: activeTab,
        limit: 50,
    });

    const [approveProduct, { isLoading: isApproving }] = useApproveProductMutation();
    const [rejectProduct, { isLoading: isRejecting }] = useRejectProductMutation();
    const isUpdating = isApproving || isRejecting;

    const products = data?.data || [];

    const handleApprove = async (id: string, name: string) => {
        try {
            await approveProduct(id).unwrap();
            toast.success(`"${name}" approved and is now live!`);
            refetch();
        } catch {
            toast.error('Failed to approve product.');
        }
    };

    const handleReject = async () => {
        if (!rejectModal) return;
        try {
            await rejectProduct({
                id: rejectModal.id,
                reason: rejectReason || 'Your product did not meet our requirements.',
            }).unwrap();
            toast.success(`"${rejectModal.name}" rejected.`);
            setRejectModal(null);
            setRejectReason('');
            refetch();
        } catch {
            toast.error('Failed to reject product.');
        }
    };

    return (
        <div>
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-800">Product Moderation</h1>
                <p className="text-sm text-gray-500 mt-0.5">Review and approve products before they go live</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeTab === tab.value
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                        {tab.value === 'pending' && activeTab === 'pending' && products.length > 0 && (
                            <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full px-1.5 py-0.5">
                                {products.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">📦</div>
                        <p className="text-gray-500 font-medium">No {activeTab === 'all' ? '' : activeTab} products found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Product</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Category</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Price</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Submitted</th>
                                <th className="text-right text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {products.map((product: any) => {
                                const category = typeof product.category === 'object' ? product.category : null;
                                return (
                                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                                        {/* Product */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0 overflow-hidden">
                                                    {product.thumbnail ? (
                                                        <img src={product.thumbnail} alt={product.name}
                                                            className="w-full h-full object-cover rounded-lg"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                    ) : '📦'}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]" title={product.name}>{product.name}</p>
                                                    {product.sku && <p className="text-xs text-gray-400">{product.sku}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Category */}
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-600">{category?.name || '—'}</span>
                                        </td>
                                        {/* Price */}
                                        <td className="px-5 py-4">
                                            <span className="text-sm font-semibold text-gray-800">৳{(product.price || 0).toLocaleString()}</span>
                                        </td>
                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            {statusBadge(product.approvalStatus)}
                                            {product.approvalStatus === 'rejected' && product.rejectionReason && (
                                                <p className="text-xs text-red-400 mt-1 max-w-[160px] truncate" title={product.rejectionReason}>
                                                    {product.rejectionReason}
                                                </p>
                                            )}
                                        </td>
                                        {/* Submitted Date */}
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-500">
                                                {product.createdAt ? new Date(product.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </span>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {product.approvalStatus !== 'approved' && (
                                                    <button
                                                        onClick={() => handleApprove(product._id, product.name)}
                                                        disabled={isUpdating}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50"
                                                    >
                                                        ✓ Approve
                                                    </button>
                                                )}
                                                {product.approvalStatus !== 'rejected' && (
                                                    <button
                                                        onClick={() => setRejectModal({ id: product._id, name: product.name })}
                                                        disabled={isUpdating}
                                                        className="px-3 py-1.5 text-xs font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition disabled:opacity-50"
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Reject Modal */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Reject Product</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            You are rejecting <strong>"{rejectModal.name}"</strong>. Provide a reason for the rejection.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="e.g. Misleading images, prohibited item, incomplete details, etc."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-400 resize-none"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={isRejecting}
                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                            >
                                {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

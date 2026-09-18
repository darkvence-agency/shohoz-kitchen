"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
    FiArrowLeft,
    FiPackage,
    FiClock,
    FiCheckCircle,
    FiTruck,
    FiMapPin,
    FiCreditCard,
    FiPhone,
    FiCopy,
    FiSlash,
    FiDownload,
    FiMail,
    FiRefreshCw,
    FiX,
    FiUploadCloud,
    FiTrash2,
} from 'react-icons/fi';
import { useGetOrderByIdQuery, useCancelOrderMutation } from '@/redux/api/orderApi';
import { useEmailInvoiceMutation } from '@/redux/api/invoiceApi';
import { useCreateReturnMutation, RETURN_REASONS } from '@/redux/api/returnApi';
import { useUploadMyImagesMutation } from '@/redux/api/uploadApi';
import { downloadInvoicePdf } from '@/lib/downloadInvoice';
import {
    getStatusConfig,
    paymentMethodLabel,
} from '@/lib/orderStatus';
import OrderProgress from '@/components/order/OrderProgress';

export default function OrderDetailPage() {
    const params = useParams();
    const router = useRouter();
    const orderId = params.id as string;

    // Fetch the single order by id
    const { data: orderData, isLoading } = useGetOrderByIdQuery(orderId);
    const order = orderData?.data;

    const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
    const [emailInvoice, { isLoading: isEmailing }] = useEmailInvoiceMutation();
    const [isDownloading, setIsDownloading] = React.useState(false);

    // ===== Return request (Phase 10) =====
    const [createReturn, { isLoading: isSubmittingReturn }] = useCreateReturnMutation();
    const [uploadMyImages, { isLoading: isUploadingReturn }] = useUploadMyImagesMutation();
    const [returnModalOpen, setReturnModalOpen] = React.useState(false);
    const [selectedItemIdx, setSelectedItemIdx] = React.useState<Record<number, boolean>>({});
    const [returnReason, setReturnReason] = React.useState('');
    const [returnDescription, setReturnDescription] = React.useState('');
    const [returnImages, setReturnImages] = React.useState<string[]>([]);

    const canCancel = order?.status === 'pending' || order?.status === 'confirmed';
    const canReturn = order?.status === 'delivered';

    const resetReturnForm = () => {
        setSelectedItemIdx({});
        setReturnReason('');
        setReturnDescription('');
        setReturnImages([]);
    };

    const openReturnModal = () => {
        resetReturnForm();
        setReturnModalOpen(true);
    };

    const closeReturnModal = () => {
        setReturnModalOpen(false);
        resetReturnForm();
    };

    const toggleItem = (idx: number) => {
        setSelectedItemIdx((prev) => ({ ...prev, [idx]: !prev[idx] }));
    };

    const handleReturnImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const remaining = 5 - returnImages.length;
        if (remaining <= 0) {
            toast.error('You can upload up to 5 images');
            e.target.value = '';
            return;
        }
        const formData = new FormData();
        Array.from(files).slice(0, remaining).forEach((file) => formData.append('images', file));
        try {
            const res = await uploadMyImages(formData).unwrap();
            const urls = res?.data?.urls || [];
            setReturnImages((prev) => [...prev, ...urls].slice(0, 5));
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to upload images');
        } finally {
            e.target.value = '';
        }
    };

    const removeReturnImage = (url: string) => {
        setReturnImages((prev) => prev.filter((u) => u !== url));
    };

    const handleSubmitReturn = async () => {
        if (!order) return;
        const selected = (order.items || []).filter((_: any, idx: number) => selectedItemIdx[idx]);
        if (selected.length === 0) {
            toast.error('Please select at least one item to return');
            return;
        }
        if (!returnReason) {
            toast.error('Please choose a reason for the return');
            return;
        }
        try {
            await createReturn({
                orderId: order._id || orderId,
                items: selected.map((i: any) => ({ product: i.product, quantity: i.quantity })),
                reason: returnReason,
                description: returnDescription,
                images: returnImages,
            }).unwrap();
            toast.success('Return request submitted successfully');
            closeReturnModal();
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to submit return request');
        }
    };

    const copyOrderId = () => {
        navigator.clipboard.writeText(order?.orderId || order?.orderNumber || orderId);
    };

    const handleDownloadInvoice = async () => {
        if (!order) return;
        setIsDownloading(true);
        try {
            await downloadInvoicePdf(order._id || orderId);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to download invoice');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleEmailInvoice = async () => {
        if (!order) return;
        try {
            const res = await emailInvoice({ orderId: order._id || orderId }).unwrap();
            toast.success(res?.message || 'Invoice emailed successfully');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to email invoice');
        }
    };

    const handleCancel = async () => {
        if (!order) return;
        if (!confirm('Are you sure you want to cancel this order? This cannot be undone.')) return;
        try {
            await cancelOrder(order._id || orderId).unwrap();
            toast.success('Order cancelled successfully');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to cancel order');
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
                    <div className="h-4 bg-gray-100 rounded w-32"></div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                    <div className="h-20 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                <FiPackage size={48} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-lg font-bold text-gray-600 mb-1">Order not found</h3>
                <p className="text-sm text-gray-400 mb-4">The order you&apos;re looking for doesn&apos;t exist</p>
                <Link href="/dashboard/user/orders" className="text-[var(--color-primary)] font-bold text-sm hover:underline">
                    ← Back to My Orders
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[var(--color-primary)] mb-4 font-semibold transition-colors"
                >
                    <FiArrowLeft size={16} />
                    Back to My Orders
                </button>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {order.orderId || order.orderNumber || `Order #${orderId.slice(-8).toUpperCase()}`}
                            </h1>
                            <button onClick={copyOrderId} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 hover:text-gray-600 transition-all">
                                <FiCopy size={14} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {(() => {
                            const cfg = getStatusConfig(order.status);
                            const Icon = cfg.icon;
                            return (
                                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
                                    <Icon size={16} />
                                    {cfg.label}
                                </span>
                            );
                        })()}
                        {canCancel && (
                            <button
                                onClick={handleCancel}
                                disabled={isCancelling}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
                            >
                                <FiSlash size={15} />
                                {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                        )}
                        {canReturn && (
                            <button
                                onClick={openReturnModal}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all"
                            >
                                <FiRefreshCw size={15} />
                                Request Return
                            </button>
                        )}
                    </div>
                </div>

                {/* Invoice Actions */}
                <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-5 border-t border-gray-50">
                    <button
                        onClick={handleDownloadInvoice}
                        disabled={isDownloading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        <FiDownload size={15} />
                        {isDownloading ? 'Preparing...' : 'Download Invoice'}
                    </button>
                    <button
                        onClick={handleEmailInvoice}
                        disabled={isEmailing}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] disabled:opacity-50 transition-all"
                    >
                        <FiMail size={15} />
                        {isEmailing ? 'Sending...' : 'Email Invoice'}
                    </button>
                </div>
            </div>

            {/* Order journey — professional animated responsive stepper */}
            <OrderProgress status={order.status} timeline={order.timeline} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Items List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50">
                            <h2 className="text-base font-bold text-gray-800">Order Items ({order.items?.length || 0})</h2>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {order.items?.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 px-6 py-4">
                                    <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                                        {item.thumbnail || item.image ? (
                                            <img src={item.thumbnail || item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <FiPackage size={20} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                                        {(item.color || item.size) && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {item.color && `Color: ${item.color}`}{item.color && item.size && ' · '}{item.size && `Size: ${item.size}`}
                                            </p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 whitespace-nowrap">
                                        ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Order Summary */}
                        <div className="px-6 py-4 bg-gray-50/50 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Subtotal</span>
                                <span className="font-semibold text-gray-600">৳{order.subtotal?.toLocaleString() || order.total?.toLocaleString()}</span>
                            </div>
                            {order.shippingCost > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Shipping</span>
                                    <span className="font-semibold text-gray-600">৳{order.shippingCost?.toLocaleString()}</span>
                                </div>
                            )}
                            {order.discount > 0 && (
                                <>
                                    {order.couponCode && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Coupon</span>
                                            <span className="font-semibold text-gray-600 uppercase tracking-wide">{order.couponCode}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Discount</span>
                                        <span className="font-semibold text-emerald-600">-৳{order.discount?.toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                            <div className="flex justify-between text-base pt-2 border-t border-gray-200 mt-2">
                                <span className="font-bold text-gray-700">Total</span>
                                <span className="font-bold text-[var(--color-primary)] text-lg">৳{order.total?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Side Info */}
                <div className="space-y-4">
                    {/* Shipping Address */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <FiMapPin size={16} className="text-[var(--color-primary)]" />
                            <h3 className="text-sm font-bold text-gray-800">Shipping Address</h3>
                        </div>
                        {order.shippingAddress ? (
                            <div className="text-sm text-gray-500 space-y-1.5">
                                <p className="font-semibold text-gray-700">{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.address}</p>
                                <p>{[order.shippingAddress.city, order.shippingAddress.area].filter(Boolean).join(', ')}</p>
                                {order.shippingAddress.postalCode && <p>{order.shippingAddress.postalCode}</p>}
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-50 text-xs text-gray-400">
                                    <FiPhone size={12} />
                                    {order.shippingAddress.phone}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400">No address info available</p>
                        )}
                    </div>

                    {/* Delivery / Tracking */}
                    {(order.trackingNumber || order.carrier || order.estimatedDelivery || order.estimatedDeliveryDate ||
                        (order.packages?.some((p: any) => p.trackingNumber || p.carrier))) && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <FiTruck size={16} className="text-[var(--color-primary)]" />
                                <h3 className="text-sm font-bold text-gray-800">Delivery / Tracking</h3>
                            </div>

                            {/* Order-level tracking */}
                            {(order.trackingNumber || order.carrier) && (
                                <div className="space-y-3 mb-4">
                                    {order.carrier && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Carrier</span>
                                            <span className="font-semibold text-gray-700">{order.carrier}</span>
                                        </div>
                                    )}
                                    {order.trackingNumber && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-400">Tracking No.</span>
                                            <span className="font-mono text-xs text-gray-600">{order.trackingNumber}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Estimated delivery hint (best-effort) */}
                            {(order.estimatedDelivery || order.estimatedDeliveryDate) && (
                                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-emerald-600">
                                    <FiClock size={13} />
                                    Est. delivery by{' '}
                                    {new Date(order.estimatedDelivery || order.estimatedDeliveryDate).toLocaleDateString('en-US', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                    })}
                                </div>
                            )}

                            {/* Per-package tracking */}
                            {order.packages?.some((p: any) => p.trackingNumber || p.carrier || p.status) && (
                                <div className="space-y-3 pt-1 border-t border-gray-50">
                                    {order.packages.map((pkg: any, idx: number) => {
                                        const pcfg = getStatusConfig(pkg.status);
                                        return (
                                            <div key={idx} className="pt-3">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <p className="text-xs font-bold text-gray-700 truncate">
                                                        {pkg.shopName || `Package ${idx + 1}`}
                                                    </p>
                                                    {pkg.status && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${pcfg.badgeBg} ${pcfg.badgeText}`}>
                                                            {pcfg.label}
                                                        </span>
                                                    )}
                                                </div>
                                                {(pkg.carrier || pkg.trackingNumber) && (
                                                    <p className="text-[11px] text-gray-400">
                                                        {pkg.carrier}
                                                        {pkg.carrier && pkg.trackingNumber && ' · '}
                                                        {pkg.trackingNumber && (
                                                            <span className="font-mono text-gray-600">{pkg.trackingNumber}</span>
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Payment Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <FiCreditCard size={16} className="text-[var(--color-primary)]" />
                            <h3 className="text-sm font-bold text-gray-800">Payment</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Method</span>
                                <span className="font-semibold text-gray-700">{paymentMethodLabel(order.paymentMethod)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Status</span>
                                <span className={`font-bold text-xs px-2 py-0.5 rounded-md capitalize ${
                                    order.paymentStatus === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                }`}>
                                    {order.paymentStatus || 'pending'}
                                </span>
                            </div>
                            {order.paymentDetails?.senderNumber && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Sender No.</span>
                                    <span className="font-mono text-xs text-gray-600">{order.paymentDetails.senderNumber}</span>
                                </div>
                            )}
                            {(order.paymentDetails?.transactionId || order.transactionId) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">TXN ID</span>
                                    <span className="font-mono text-xs text-gray-600">{order.paymentDetails?.transactionId || order.transactionId}</span>
                                </div>
                            )}
                            {order.paymentDetails?.paymentTime && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Paid At</span>
                                    <span className="text-xs text-gray-600">{new Date(order.paymentDetails.paymentTime).toLocaleString('en-US')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    {order.timeline && order.timeline.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 mb-4">Activity</h3>
                            <div className="space-y-4">
                                {order.timeline.map((event: any, idx: number) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5 flex-shrink-0"></div>
                                        <div>
                                            <p className="text-xs font-semibold text-gray-700 capitalize">{event.status || event.action}</p>
                                            {event.note && <p className="text-[11px] text-gray-500 mt-0.5">{event.note}</p>}
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                {new Date(event.createdAt || event.timestamp || event.date).toLocaleString('en-US')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ===== Return Request Modal (Phase 10) ===== */}
            {returnModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div
                        className="absolute inset-0 bg-black/45"
                        onClick={closeReturnModal}
                    />
                    <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <FiRefreshCw size={18} className="text-[var(--color-primary)]" />
                                <h3 className="text-base font-bold text-gray-900">Request a Return</h3>
                            </div>
                            <button
                                onClick={closeReturnModal}
                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition-all"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                            {/* Item selection */}
                            <div>
                                <p className="text-sm font-bold text-gray-800 mb-2">Select items to return</p>
                                <div className="space-y-2">
                                    {order.items?.map((item: any, idx: number) => {
                                        const checked = !!selectedItemIdx[idx];
                                        return (
                                            <label
                                                key={idx}
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    checked
                                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)]'
                                                        : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleItem(idx)}
                                                    className="w-4 h-4 accent-[var(--color-primary)] flex-shrink-0"
                                                />
                                                <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                                                    {item.thumbnail || item.image ? (
                                                        <img src={item.thumbnail || item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                            <FiPackage size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">Reason</label>
                                <select
                                    value={returnReason}
                                    onChange={(e) => setReturnReason(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all"
                                >
                                    <option value="">Select a reason...</option>
                                    {RETURN_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                    Description <span className="font-normal text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                    value={returnDescription}
                                    onChange={(e) => setReturnDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Tell us more about the issue..."
                                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all resize-none"
                                />
                            </div>

                            {/* Image upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-800 mb-2">
                                    Photos <span className="font-normal text-gray-400">(optional, up to 5)</span>
                                </label>
                                <div className="flex flex-wrap gap-2.5">
                                    {returnImages.map((url) => (
                                        <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 group">
                                            <img src={url} alt="return" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeReturnImage(url)}
                                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-red-500 transition-all"
                                            >
                                                <FiTrash2 size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {returnImages.length < 5 && (
                                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-lightest)] transition-all text-gray-400 hover:text-[var(--color-primary)]">
                                            {isUploadingReturn ? (
                                                <span className="text-[10px] font-semibold">Uploading...</span>
                                            ) : (
                                                <>
                                                    <FiUploadCloud size={20} />
                                                    <span className="text-[10px] font-semibold">Add</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleReturnImageUpload}
                                                disabled={isUploadingReturn}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100">
                            <button
                                onClick={closeReturnModal}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitReturn}
                                disabled={isSubmittingReturn || isUploadingReturn}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {isSubmittingReturn ? 'Submitting...' : 'Submit Return'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

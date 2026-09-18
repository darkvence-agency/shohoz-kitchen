"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FiArrowLeft,
    FiTruck,
    FiPackage,
    FiDollarSign,
    FiMapPin,
    FiUser,
    FiClock,
    FiCheckCircle,
    FiPrinter,
    FiEdit3,
    FiSave,
    FiCalendar,
    FiMail,
    FiPhone
} from 'react-icons/fi';
import {
    useGetAdminOrderByIdQuery,
    useUpdateOrderStatusMutation,
    useUpdatePaymentStatusMutation,
    useAddAdminNoteMutation,
    useUpdateAdminOrderTrackingMutation
} from '@/redux/api/orderApi';
import { useBookCourierPackageMutation, useRefreshCourierStatusMutation } from '@/redux/api/courierApi';
import OrderProgress from '@/components/order/OrderProgress';
import { toast } from 'react-hot-toast';
import {
    ORDER_STATUS_CONFIG,
    getStatusConfig,
    paymentMethodLabel,
    paymentMethodBadge,
    CARRIERS
} from '@/lib/orderStatus';
import { downloadInvoicePdf } from '@/lib/downloadInvoice';

// Shared status badge built from the canonical 11-state config
const StatusBadge = ({ status }: { status: string }) => {
    const { label, badgeBg, badgeText, icon: Icon } = getStatusConfig(status);
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold ${badgeBg} ${badgeText}`}>
            <Icon size={14} />
            <span>{label}</span>
        </span>
    );
};

export default function OrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: orderResponse, isLoading, refetch } = useGetAdminOrderByIdQuery(id);
    const order = orderResponse?.data;

    const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
    const [updatePayment, { isLoading: isUpdatingPayment }] = useUpdatePaymentStatusMutation();
    const [addNote, { isLoading: isAddingNote }] = useAddAdminNoteMutation();
    const [updateTracking, { isLoading: isUpdatingTracking }] = useUpdateAdminOrderTrackingMutation();
    const [bookCourier] = useBookCourierPackageMutation();
    const [refreshCourier] = useRefreshCourierStatusMutation();
    const [busyPkg, setBusyPkg] = useState<string | null>(null);

    const handleBookCourier = async (packageId: string) => {
        if (!order?._id) return;
        setBusyPkg(packageId);
        try {
            await bookCourier({ orderId: order._id, packageId }).unwrap();
            toast.success('Booked with Steadfast — tracking number generated');
        } catch (e: any) {
            toast.error(e?.data?.message || 'Failed to book with Steadfast');
        } finally { setBusyPkg(null); }
    };

    const handleRefreshCourier = async (packageId: string) => {
        if (!order?._id) return;
        setBusyPkg(packageId);
        try {
            const res = await refreshCourier({ orderId: order._id, packageId }).unwrap();
            toast.success(`Steadfast status: ${res?.data?.courierStatus || 'updated'}`);
            if (res?.data?.needsConfirmation) {
                toast(`Courier reports "${res.data.suggestedStatus}" — confirm via the Status control to settle earnings/stock.`, { icon: 'ℹ️', duration: 6000 });
            }
        } catch (e: any) {
            toast.error(e?.data?.message || 'Failed to fetch Steadfast status');
        } finally { setBusyPkg(null); }
    };

    const [adminNote, setAdminNote] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [carrier, setCarrier] = useState('');
    const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

    const handleDownloadInvoice = async () => {
        if (!order?._id) return;
        setIsDownloadingInvoice(true);
        try {
            await downloadInvoicePdf(order._id);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to download invoice');
        } finally {
            setIsDownloadingInvoice(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedStatus) return;
        try {
            await updateStatus({ id, status: selectedStatus }).unwrap();
            toast.success('Order status updated');
            setSelectedStatus('');
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to update status');
        }
    };

    const handleUpdatePayment = async () => {
        if (!selectedPaymentStatus) return;
        try {
            await updatePayment({ id, paymentStatus: selectedPaymentStatus }).unwrap();
            toast.success('Payment status updated');
            setSelectedPaymentStatus('');
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to update payment');
        }
    };

    const handleAddNote = async () => {
        if (!adminNote) return;
        try {
            await addNote({ id, note: adminNote }).unwrap();
            toast.success('Note added');
            setAdminNote('');
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to add note');
        }
    };

    const handleUpdateTracking = async () => {
        try {
            await updateTracking({
                id,
                trackingNumber: trackingNumber ?? order?.trackingNumber ?? '',
                carrier: carrier || order?.carrier || '',
            }).unwrap();
            toast.success('Tracking updated');
        } catch (error: any) {
            toast.error(error.data?.message || 'Failed to update tracking');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full font-medium"></div>
            </div>
        );
    }

    if (!order) {
        return <div className="p-8 text-center text-gray-500">Order not found</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto mb-10">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-md border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-md transition-colors border border-gray-100">
                        <FiArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-800">{order.orderId || order.orderNumber}</h1>
                            <StatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <FiCalendar size={14} />
                            Placed on {new Date(order.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleDownloadInvoice}
                        disabled={isDownloadingInvoice}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-all text-gray-600 shadow-sm disabled:opacity-50"
                    >
                        <FiPrinter size={16} />
                        {isDownloadingInvoice ? 'Preparing...' : 'Invoice'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Items Table */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                            <FiPackage className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold text-gray-800">Order Items</h2>
                            <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold">{order.items.length} Items</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-md bg-gray-50 overflow-hidden border border-gray-100 p-1">
                                                        <img src={item.product?.thumbnail || item.image} alt={item.name} className="w-full h-full object-cover rounded-sm" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{item.name}</p>
                                                        {(item.color || item.size) && (
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                {item.color && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                                        🎨 {item.color}
                                                                    </span>
                                                                )}
                                                                {item.size && (
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                                        📏 {item.size}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                        {item.variant && (
                                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                                SKU: {item.variant.sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">৳{(item.price || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">x{item.quantity}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">৳{(item.subtotal || (item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Summary */}
                        <div className="bg-gray-50/50 p-6 border-t border-gray-100">
                            <div className="flex flex-col gap-2 ml-auto max-w-xs">
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Subtotal:</span>
                                    <span className="font-bold text-gray-800">৳{(order.subtotal || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>Shipping:</span>
                                    <span className="font-bold text-gray-800">৳{(order.shippingCost || 0).toLocaleString()}</span>
                                </div>
                                {order.discount > 0 && (
                                    <>
                                        {order.couponCode && (
                                            <div className="flex justify-between text-sm text-gray-500">
                                                <span>Coupon Code:</span>
                                                <span className="font-bold text-gray-700 uppercase tracking-wide">{order.couponCode}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-sm text-red-500">
                                            <span>Discount:</span>
                                            <span className="font-bold">-৳{(order.discount || 0).toLocaleString()}</span>
                                        </div>
                                    </>
                                )}
                                <div className="h-px bg-gray-200 my-2"></div>
                                <div className="flex justify-between text-lg font-bold text-gray-900">
                                    <span>Total:</span>
                                    <span className="text-[var(--color-primary)]">৳{(order.total || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order journey — animated responsive progress stepper */}
                    <OrderProgress status={order.status} timeline={order.timeline} className="!rounded-md" />

                    {/* Detailed timeline / activity log */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-6 text-gray-800">
                            <FiClock className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold">Activity Log</h2>
                        </div>
                        <div className="space-y-6">
                            {order.timeline?.map((step: any, idx: number) => (
                                <div key={idx} className="relative flex gap-4">
                                    {idx !== order.timeline.length - 1 && (
                                        <div className="absolute left-3 top-7 bottom-0 w-px bg-gray-100"></div>
                                    )}
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 z-10 bg-white ${idx === 0 ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-gray-200 text-gray-400'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`}></div>
                                    </div>
                                    <div className="flex-1 -mt-1">
                                        <div className="flex justify-between">
                                            <p className="text-sm font-bold text-gray-800">{getStatusConfig(step.status).label}</p>
                                            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                                                {step.createdAt ? new Date(step.createdAt).toLocaleString() : ''}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{step.note}</p>
                                    </div>
                                </div>
                            )) || <p className="text-gray-400 text-center italic py-4">No timeline available</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column - Customer & Actions */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4 text-gray-800">
                            <FiUser className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold">Customer Details</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-md bg-gray-50 border border-gray-100 flex items-center justify-center font-bold text-[var(--color-primary)]">
                                    {(order.user?.firstName || order.shippingAddress?.fullName || '?')[0]}{(order.user?.lastName || '')[0]}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800">{order.user?.firstName ? `${order.user.firstName} ${order.user.lastName || ''}` : order.shippingAddress?.fullName || 'Guest'}</p>
                                    <p className="text-xs text-gray-400">Customer ID: {order.user?._id?.slice(-8)}</p>
                                </div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-gray-50">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <FiMail size={14} />
                                    <span>{order.user?.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <FiPhone size={14} />
                                    <span>{order.user?.phone || order.shippingAddress?.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4 text-gray-800">
                            <FiMapPin className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold">Shipping To</h2>
                        </div>
                        <div className="text-sm text-gray-600 leading-relaxed">
                            <p className="font-bold text-gray-800 mb-1">{order.shippingAddress?.fullName || 'N/A'}</p>
                            <p>{order.shippingAddress?.address || ''}</p>
                            <p>{[order.shippingAddress?.area, order.shippingAddress?.city, order.shippingAddress?.postalCode].filter(Boolean).join(', ') || ''}</p>
                            {order.shippingAddress?.phone && <p>{order.shippingAddress.phone}</p>}
                            <p className="mt-2 font-bold text-gray-400 flex items-center gap-1 uppercase text-[10px]">
                                <FiTruck size={12} />
                                {order.shippingMethod || 'Standard'} Delivery
                            </p>
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 text-gray-800">
                            <FiDollarSign className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold">Payment Information</h2>
                        </div>

                        {/* Method Badge */}
                        {(() => {
                            const methodKey = (order.paymentMethod || '').toLowerCase();
                            const label = order.paymentMethod ? paymentMethodLabel(order.paymentMethod) : '—';
                            const badge = paymentMethodBadge[methodKey] || { bg: '#f3f4f6', color: '#6b7280' };
                            return (
                                <div className="px-6 py-4 flex items-center gap-3" style={{ background: badge.bg }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: badge.color, color: 'white' }}>
                                        {label.slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-black text-base" style={{ color: badge.color }}>{label}</p>
                                        <p className="text-xs text-gray-500 font-medium">Payment Method</p>
                                    </div>
                                    <div className="ml-auto">
                                        <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                                            order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                            order.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {order.paymentStatus?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="px-6 py-4 space-y-3">
                            {/* Payment Details from Customer */}
                            {order.paymentDetails?.senderNumber && (
                                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <FiPhone size={13} /> Sender Number:
                                    </span>
                                    <span className="font-medium font-mono text-gray-800">{order.paymentDetails.senderNumber}</span>
                                </div>
                            )}
                            {(order.paymentDetails?.transactionId || order.transactionId) && (
                                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                                    <span className="text-gray-500">Transaction ID:</span>
                                    <span className="font-mono font-medium text-gray-800 text-xs bg-gray-50 px-2 py-1 rounded">
                                        {order.paymentDetails?.transactionId || order.transactionId}
                                    </span>
                                </div>
                            )}
                            {order.paymentDetails?.paymentTime && (
                                <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-3">
                                    <span className="text-gray-500 flex items-center gap-1.5">
                                        <FiClock size={13} /> Payment Time:
                                    </span>
                                    <span className="text-gray-700 text-xs font-medium">
                                        {new Date(order.paymentDetails.paymentTime).toLocaleString('en-US')}
                                    </span>
                                </div>
                            )}

                            {/* Change Payment Status */}
                            <div className="flex justify-between items-center text-sm pt-1">
                                <span className="text-gray-500">Change Status:</span>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={selectedPaymentStatus || order.paymentStatus}
                                        onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                                        className="text-xs border border-gray-200 rounded-md p-1.5 outline-none bg-gray-50"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="failed">Failed</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                    {selectedPaymentStatus && selectedPaymentStatus !== order.paymentStatus && (
                                        <button onClick={handleUpdatePayment} disabled={isUpdatingPayment} className="p-1.5 bg-[var(--color-primary)] text-white rounded-md shadow-sm">
                                            <FiCheckCircle size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Change Status */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4 text-gray-800">
                            <FiEdit3 className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold">Order Actions</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Change Status</label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedStatus || order.status}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-md p-2 text-sm outline-none bg-gray-50/50"
                                    >
                                        {Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleUpdateStatus}
                                        disabled={!selectedStatus || isUpdatingStatus}
                                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-dark)] transition-all shadow-md disabled:opacity-50"
                                    >
                                        <FiSave size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="h-px bg-gray-50"></div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Admin Note</label>
                                <textarea
                                    className="w-full border border-gray-200 rounded-md p-3 text-sm outline-none bg-gray-50/50 focus:bg-white transition-all h-24 italic"
                                    placeholder="Add a private note regarding this order..."
                                    value={adminNote || order.adminNote || ''}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                ></textarea>
                                <button
                                    onClick={handleAddNote}
                                    disabled={!adminNote || isAddingNote}
                                    className="w-full mt-2 py-2 border border-gray-200 rounded-md text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {isAddingNote ? 'Saving...' : 'Update Note'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tracking */}
                    <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center gap-2 mb-4 text-gray-800">
                            <FiTruck className="text-[var(--color-primary)]" size={20} />
                            <h2 className="font-bold">Tracking</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Tracking Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. SF1234567890"
                                    value={trackingNumber || order.trackingNumber || ''}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md p-2 text-sm outline-none bg-gray-50/50 focus:bg-white transition-all font-mono"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase">Carrier</label>
                                <select
                                    value={carrier || order.carrier || ''}
                                    onChange={(e) => setCarrier(e.target.value)}
                                    className="w-full border border-gray-200 rounded-md p-2 text-sm outline-none bg-gray-50/50"
                                >
                                    <option value="">Select carrier</option>
                                    {CARRIERS.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleUpdateTracking}
                                disabled={isUpdatingTracking}
                                className="w-full py-2 bg-[#4F46E5] text-white rounded-md text-sm font-bold hover:bg-[#4338CA] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <FiSave size={16} />
                                {isUpdatingTracking ? 'Saving...' : 'Save Tracking'}
                            </button>
                        </div>
                    </div>

                    {/* Courier — Steadfast (per shipment) */}
                    {Array.isArray(order.packages) && order.packages.length > 0 && (
                        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-1 text-gray-800">
                                <FiTruck className="text-[var(--color-primary)]" size={20} />
                                <h2 className="font-bold">Courier — Steadfast</h2>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-4">Book the parcel with Steadfast and sync delivery status. Booking creates a real consignment and marks the parcel as shipped.</p>
                            <div className="space-y-3">
                                {order.packages.map((pkg: any, idx: number) => {
                                    const booked = !!(pkg.consignmentId || pkg.trackingNumber);
                                    const busy = busyPkg === pkg._id;
                                    return (
                                        <div key={pkg._id} className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
                                            <div className="flex items-center justify-between mb-2 gap-2">
                                                <span className="text-sm font-bold text-gray-700 truncate">{`Package ${idx + 1}`}</span>
                                                <StatusBadge status={pkg.status} />
                                            </div>
                                            {booked ? (
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Tracking</span><span className="font-mono font-bold text-gray-700">{pkg.trackingNumber || '—'}</span></div>
                                                    <div className="flex justify-between text-xs"><span className="text-gray-400">Consignment</span><span className="font-mono text-gray-600">{pkg.consignmentId || '—'}</span></div>
                                                    {pkg.courierStatus && <div className="flex justify-between text-xs"><span className="text-gray-400">Courier status</span><span className="font-semibold text-gray-700">{pkg.courierStatus}</span></div>}
                                                    <button onClick={() => handleRefreshCourier(pkg._id)} disabled={busy} className="mt-1 w-full py-1.5 border border-[#4F46E5] text-[#4F46E5] rounded-md text-xs font-bold hover:bg-indigo-50 disabled:opacity-50">
                                                        {busy ? 'Refreshing…' : '🔄 Refresh status'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleBookCourier(pkg._id)} disabled={busy} className="w-full py-2 bg-[#4F46E5] text-white rounded-md text-xs font-bold hover:bg-[#4338CA] disabled:opacity-50">
                                                    {busy ? 'Booking…' : '📦 Book with Steadfast'}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

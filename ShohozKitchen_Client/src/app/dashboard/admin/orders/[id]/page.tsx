"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
    FiPhone,
    FiTag,
    FiFileText,
    FiSend,
    FiCopy,
    FiExternalLink,
    FiRefreshCw,
    FiX,
    FiAlertCircle
} from 'react-icons/fi';
import {
    useGetAdminOrderByIdQuery,
    useUpdateOrderStatusMutation,
    useUpdatePaymentStatusMutation,
    useAddAdminNoteMutation
} from '@/redux/api/orderApi';
import { useBookCourierPackageMutation, useRefreshCourierStatusMutation } from '@/redux/api/courierApi';
import OrderProgress from '@/components/order/OrderProgress';
import { toast } from 'react-hot-toast';
import {
    ORDER_STATUS_CONFIG,
    getStatusConfig,
    paymentMethodLabel,
    paymentMethodBadge,
    courierStatusLabel,
    courierStatusBadgeClass
} from '@/lib/orderStatus';
import { downloadInvoicePdf } from '@/lib/downloadInvoice';
import FraudOrderBanner from '../../fraud-check/FraudOrderBanner';
import PrintOrdersModal, { type PrintKind } from '@/components/admin/print/PrintOrdersModal';
import EditOrderModal from '@/components/admin/orders/EditOrderModal';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

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

/** A saved order line. The list-price fields are newer — older orders do not have them. */
interface OrderLine {
    name: string;
    image?: string;
    product?: { thumbnail?: string } | null;
    price: number;
    quantity: number;
    total?: number;
    color?: string;
    size?: string;
    sku?: string;
    variant?: { sku?: string };
    originalPrice?: number;
    discountPercent?: number;
    priceOverridden?: boolean;
}

interface TimelineStep {
    status: string;
    note?: string;
    createdAt?: string;
}

/** One shipment of the order (orders normally have exactly one). */
interface OrderPackage {
    _id: string;
    status: string;
    subtotal: number;
    consignmentId?: string;
    trackingNumber?: string;
    courierStatus?: string;
    courierBookedAt?: string;
    courierAttemptAt?: string;
}

// An order may still be corrected while it is one of these and no parcel has gone to the
// courier. Mirrors EDITABLE_STATUSES / editBlockedReason() in
// ShohozKitchen_Server/src/app/modules/order/order.service.ts — change the two together.
// The server decides; this only decides whether to offer the button, and says why not.
const EDITABLE_STATUSES = ['pending', 'confirmed', 'processing'];

function editBlockedReason(order: { status?: string; packages?: OrderPackage[] }): string | null {
    for (const pkg of order.packages || []) {
        if (pkg.consignmentId) return 'Booked with Steadfast — their API cannot change a parcel, so edit it in the Steadfast panel.';
        if (pkg.courierAttemptAt) return 'A send to Steadfast has not finished. Check the courier card below first.';
        if (pkg.trackingNumber) return 'This order already carries a courier tracking number.';
    }
    if (!EDITABLE_STATUSES.includes(order.status || '')) {
        return `An order that is ${getStatusConfig(order.status || '').label.toLowerCase()} can no longer be edited.`;
    }
    return null;
}

/** The order fields a Steadfast booking reads. */
interface CourierOrder {
    orderId?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    shippingCost?: number;
    discount?: number;
    note?: string;
    shippingAddress?: { fullName?: string; phone?: string; address?: string; area?: string; city?: string; postalCode?: string };
    packages?: { _id: string }[];
}

// Steadfast's public tracking page — the code must be pasted there; there is no verified deep-link format.
const STEADFAST_TRACKING_URL = 'https://steadfast.com.bd/tracking';

// Package statuses the API refuses to book (TERMINAL_STATUSES in ShohozKitchen_Server/src/app/modules/courier/courier.service.ts).
const UNSENDABLE_STATUSES = ['delivered', 'cancelled', 'returned', 'refunded'];

/** The server's error message from an RTK Query failure, else the fallback. */
const apiError = (e: unknown, fallback: string) =>
    (e as { data?: { message?: string } } | null)?.data?.message || fallback;

// Mirrors codFor(order, pkg) in ShohozKitchen_Server/src/app/modules/courier/courier.service.ts —
// change the two together. Read-only: it only shows the amount; the server works it out
// again when it books.
function codFor(order: CourierOrder, pkg: { _id: string; subtotal: number }): number {
    if (order.paymentMethod !== 'cod' || order.paymentStatus === 'paid') return 0;
    const isPrimary = !!order.packages?.[0] && String(order.packages[0]._id) === String(pkg._id);
    const adjustment = isPrimary ? (order.shippingCost || 0) - (order.discount || 0) : 0;
    return Math.max(0, pkg.subtotal + adjustment);
}

// What bookPackageCore() in courier.service.ts sends to Steadfast, rebuilt the same way,
// so the confirmation shows exactly what will go out.
function steadfastPayload(order: CourierOrder, pkg: OrderPackage) {
    const a = order.shippingAddress || {};
    return {
        invoice: `${order.orderId}-${String(pkg._id).slice(-5)}`,
        recipientName: a.fullName || '',
        recipientPhone: (a.phone || '').replace(/\D/g, '').slice(-11),
        recipientAddress: [a.address, a.area, a.city, a.postalCode].filter(Boolean).join(', '),
        codAmount: codFor(order, pkg),
        note: order.note || '',
    };
}

/** Confirmation before a real Steadfast consignment is created. */
function SendToSteadfastModal({ order, pkg, title, sending, error, onCancel, onConfirm }: {
    order: CourierOrder;
    pkg: OrderPackage;
    title: string;
    sending: boolean;
    error: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !sending) onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [sending, onCancel]);

    const p = steadfastPayload(order, pkg);
    const method = (order.paymentMethod || '').toLowerCase();
    const codHint = p.codAmount > 0 ? '' :
        method !== 'cod' ? `Paid by ${paymentMethodLabel(order.paymentMethod || '') || 'another method'} — nothing to collect.` :
        order.paymentStatus === 'paid' ? 'Already paid — nothing to collect.' : '';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={sending ? undefined : onCancel} />
            <div role="dialog" aria-modal="true" aria-labelledby="send-steadfast-title" className="relative w-full max-w-md bg-white rounded-md border border-gray-200 shadow-xl flex flex-col max-h-[90vh]">
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-gray-800">
                        <FiSend className="text-[var(--color-primary)]" size={18} />
                        <div>
                            <h3 id="send-steadfast-title" className="font-bold">Send to Steadfast</h3>
                            <p className="text-xs text-gray-500">{title}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onCancel} disabled={sending} aria-label="Close" className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 disabled:opacity-40">
                        <FiX size={16} />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-4 overflow-y-auto">
                    <div className="space-y-2.5 text-sm">
                        <div className="flex gap-3">
                            <span className="w-20 shrink-0 text-xs font-bold text-gray-400 uppercase pt-0.5">Name</span>
                            <span className="font-semibold text-gray-800">{p.recipientName || '—'}</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-20 shrink-0 text-xs font-bold text-gray-400 uppercase pt-0.5">Phone</span>
                            <span className="font-mono text-gray-800">{p.recipientPhone || '—'}</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-20 shrink-0 text-xs font-bold text-gray-400 uppercase pt-0.5">Address</span>
                            <span className="text-gray-700 break-words min-w-0">{p.recipientAddress || '—'}</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-20 shrink-0 text-xs font-bold text-gray-400 uppercase pt-0.5">Note</span>
                            <span className="text-gray-700 break-words min-w-0 whitespace-pre-line">{p.note || <span className="text-gray-400">No note</span>}</span>
                        </div>
                        <div className="flex gap-3">
                            <span className="w-20 shrink-0 text-xs font-bold text-gray-400 uppercase pt-0.5">Invoice</span>
                            <span className="font-mono text-xs text-gray-600 pt-0.5">{p.invoice}</span>
                        </div>
                    </div>

                    <div className={`rounded-md border px-4 py-3 ${p.codAmount > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <span className={`text-sm font-semibold ${p.codAmount > 0 ? 'text-emerald-700' : 'text-gray-600'}`}>COD amount Steadfast will collect</span>
                            <span className={`text-lg font-bold ${p.codAmount > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>৳{p.codAmount.toLocaleString()}</span>
                        </div>
                        {codHint && <p className="text-xs text-gray-500 mt-1">{codHint}</p>}
                    </div>

                    <p className="text-xs text-gray-400">Check these details first — after sending, changes must be made in the Steadfast panel.</p>

                    {error && (
                        <div role="alert" className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2.5">
                            <FiAlertCircle size={14} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={sending}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={sending}
                        className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold hover:bg-[var(--color-primary-dark)] transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                        <FiSend size={14} />
                        {sending ? 'Sending…' : 'Confirm & send'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function OrderDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { data: orderResponse, isLoading } = useGetAdminOrderByIdQuery(id);
    const order = orderResponse?.data;

    const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateOrderStatusMutation();
    const [updatePayment, { isLoading: isUpdatingPayment }] = useUpdatePaymentStatusMutation();
    const [addNote, { isLoading: isAddingNote }] = useAddAdminNoteMutation();
    const [bookCourier, { isLoading: isSending }] = useBookCourierPackageMutation();
    const [refreshCourier] = useRefreshCourierStatusMutation();
    const [busyPkg, setBusyPkg] = useState<string | null>(null);
    // The package waiting in the "Send to Steadfast" confirmation, and why the last send failed.
    const [sendPkgId, setSendPkgId] = useState<string | null>(null);
    const [sendError, setSendError] = useState('');
    // Editors confirm orders, add notes and print; payment, tracking and courier booking are for admins.
    const isEditor = useSelector((s: RootState) => s.auth.user?.role) === 'editor';

    const openSendToSteadfast = (packageId: string) => {
        setSendError('');
        setSendPkgId(packageId);
    };

    const closeSendToSteadfast = () => {
        if (isSending) return;
        setSendPkgId(null);
        setSendError('');
    };

    const handleSendToSteadfast = async () => {
        if (!order?._id || !sendPkgId) return;
        setSendError('');
        try {
            const res = await bookCourier({ orderId: order._id, packageId: sendPkgId }).unwrap();
            const code = res?.data?.trackingNumber;
            toast.success(code ? `Sent to Steadfast — tracking code ${code}` : 'Sent to Steadfast');
            setSendPkgId(null);
        } catch (e) {
            setSendError(apiError(e, 'Could not send to Steadfast.'));
        }
    };

    const handleRefreshCourier = async (packageId: string) => {
        if (!order?._id) return;
        setBusyPkg(packageId);
        try {
            const res = await refreshCourier({ orderId: order._id, packageId }).unwrap();
            toast.success(`Steadfast status: ${res?.data?.courierStatus ? courierStatusLabel(res.data.courierStatus) : 'updated'}`);
            if (res?.data?.needsConfirmation) {
                toast(`Courier reports "${res.data.suggestedStatus}" — confirm via the Status control to settle earnings/stock.`, { icon: 'ℹ️', duration: 6000 });
            }
        } catch (e) {
            toast.error(apiError(e, 'Failed to fetch Steadfast status'));
        } finally { setBusyPkg(null); }
    };

    const copyTrackingCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success('Copied');
        } catch {
            toast.error('Could not copy — select the code and copy it by hand');
        }
    };

    const [adminNote, setAdminNote] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
    const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
    const [printKind, setPrintKind] = useState<PrintKind | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const handleDownloadInvoice = async () => {
        if (!order?._id) return;
        setIsDownloadingInvoice(true);
        try {
            await downloadInvoicePdf(order._id);
        } catch (error) {
            toast.error((error instanceof Error && error.message) || 'Failed to download invoice');
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
        } catch (error) {
            toast.error(apiError(error, 'Failed to update status'));
        }
    };

    const handleUpdatePayment = async () => {
        if (!selectedPaymentStatus) return;
        try {
            await updatePayment({ id, paymentStatus: selectedPaymentStatus }).unwrap();
            toast.success('Payment status updated');
            setSelectedPaymentStatus('');
        } catch (error) {
            toast.error(apiError(error, 'Failed to update payment'));
        }
    };

    const handleAddNote = async () => {
        if (!adminNote) return;
        try {
            await addNote({ id, note: adminNote }).unwrap();
            toast.success('Note added');
            setAdminNote('');
        } catch (error) {
            toast.error(apiError(error, 'Failed to add note'));
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

    const packages: OrderPackage[] = Array.isArray(order.packages) ? order.packages : [];
    const sendPkg = sendPkgId ? packages.find((p) => p._id === sendPkgId) : undefined;
    // Order-level tracking typed in by hand before the Steadfast integration. Shown read-only
    // so older data is never hidden; tracking now comes from the Steadfast booking per package.
    const editBlocked = editBlockedReason(order);
    const legacyTracking = [order.carrier, order.trackingNumber]
        .map((v: unknown) => (typeof v === 'string' ? v.trim() : ''))
        .filter(Boolean)
        .join(' · ');

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
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={() => setIsEditing(true)}
                        disabled={!!editBlocked}
                        title={editBlocked || undefined}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-all text-gray-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiEdit3 size={16} />
                        Edit order
                    </button>
                    <button
                        onClick={handleDownloadInvoice}
                        disabled={isDownloadingInvoice}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-all text-gray-600 shadow-sm disabled:opacity-50"
                    >
                        <FiPrinter size={16} />
                        {isDownloadingInvoice ? 'Preparing...' : 'Invoice'}
                    </button>
                    <button
                        onClick={() => setPrintKind('labels')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-all text-gray-600 shadow-sm"
                    >
                        <FiTag size={16} />
                        Print label
                    </button>
                    <button
                        onClick={() => setPrintKind('invoices')}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-all text-gray-600 shadow-sm"
                    >
                        <FiFileText size={16} />
                        Print invoice
                    </button>
                </div>
            </div>

            {/* Fraud check: shows only when this order was flagged */}
            <FraudOrderBanner orderId={order._id} />

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
                                    {order.items.map((item: OrderLine, idx: number) => {
                                        const price = item.price || 0;
                                        // The saved line total; old data without one falls back to price × qty.
                                        const lineTotal = typeof item.total === 'number' ? item.total : price * (item.quantity || 1);
                                        const original = item.originalPrice || 0;
                                        const soldBelowList = original > price;
                                        const pctOff = !soldBelowList ? 0
                                            : (item.discountPercent && item.discountPercent > 0 ? item.discountPercent : ((original - price) / original) * 100);
                                        const sku = item.sku || item.variant?.sku;
                                        return (
                                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-md bg-gray-50 overflow-hidden border border-gray-100 p-1">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                                                        {sku && (
                                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                                                                SKU: {sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {soldBelowList || item.priceOverridden ? (
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {soldBelowList && (
                                                        <span className="block text-xs text-gray-400 line-through">৳{original.toLocaleString()}</span>
                                                    )}
                                                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                                                        ৳{price.toLocaleString()}
                                                        {soldBelowList && (
                                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                                                −{Math.round(pctOff * 10) / 10}%
                                                            </span>
                                                        )}
                                                    </span>
                                                    {item.priceOverridden && (
                                                        <span className="block w-fit mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                                            Custom price
                                                        </span>
                                                    )}
                                                </td>
                                            ) : (
                                                <td className="px-6 py-4 text-sm text-gray-600">৳{price.toLocaleString()}</td>
                                            )}
                                            <td className="px-6 py-4 text-sm text-gray-600">x{item.quantity}</td>
                                            <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">৳{lineTotal.toLocaleString()}</td>
                                        </tr>
                                        );
                                    })}
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
                            {order.timeline?.map((step: TimelineStep, idx: number) => (
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
                                        <FiPhone size={13} /> {order.paymentMethod === 'bank' ? 'Paid from:' : 'Sender Number:'}
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

                            {/* Change Payment Status (not for editors) */}
                            {!isEditor && <div className="flex justify-between items-center text-sm pt-1">
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
                            </div>}
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

                    {/* Courier — Steadfast, one block per shipment (not for editors) */}
                    {!isEditor && (packages.length > 0 || legacyTracking) && (
                        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-1 text-gray-800">
                                <FiTruck className="text-[var(--color-primary)]" size={20} />
                                <h2 className="font-bold">Courier — Steadfast</h2>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-4">Sending creates a real Steadfast consignment — they pick the parcel up and collect any COD. The parcel is marked as shipped.</p>
                            <div className="space-y-3">
                                {packages.map((pkg, idx) => {
                                    const booked = !!(pkg.consignmentId || pkg.trackingNumber);
                                    const busy = busyPkg === pkg._id;
                                    const trackingCode = pkg.trackingNumber || '';
                                    return (
                                        <div key={pkg._id} className="border border-gray-100 rounded-md p-3 bg-gray-50/50">
                                            <div className="flex items-center justify-between mb-3 gap-2">
                                                <span className="text-sm font-bold text-gray-700 truncate">{packages.length > 1 ? `Package ${idx + 1}` : 'Parcel'}</span>
                                                <StatusBadge status={pkg.status} />
                                            </div>
                                            {booked ? (
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center justify-between gap-2 text-xs">
                                                        <span className="text-gray-400">Courier status</span>
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-semibold ${courierStatusBadgeClass(pkg.courierStatus)}`}>
                                                            {courierStatusLabel(pkg.courierStatus)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between gap-2 text-xs">
                                                        <span className="text-gray-400">Consignment ID</span>
                                                        <span className="font-mono text-gray-700">{pkg.consignmentId || '—'}</span>
                                                    </div>
                                                    {pkg.courierBookedAt && (
                                                        <div className="flex justify-between gap-2 text-xs">
                                                            <span className="text-gray-400">Sent</span>
                                                            <span className="text-gray-600 text-right">{new Date(pkg.courierBookedAt).toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1.5">
                                                        <span className="block text-xs text-gray-400">Tracking code</span>
                                                        {trackingCode ? (
                                                            <>
                                                                <p className="font-mono text-sm font-bold text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-1.5 break-all">{trackingCode}</p>
                                                                {/* Copy first, then paste it on Steadfast's tracking page. */}
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyTrackingCode(trackingCode)}
                                                                        aria-label="Copy tracking code"
                                                                        className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all"
                                                                    >
                                                                        <FiCopy size={13} /> Copy
                                                                    </button>
                                                                    <a
                                                                        href={STEADFAST_TRACKING_URL}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        title="Opens Steadfast's tracking page — paste the code there"
                                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all whitespace-nowrap"
                                                                    >
                                                                        Open Steadfast tracking <FiExternalLink size={13} />
                                                                    </a>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <p className="font-mono text-xs text-gray-500">—</p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRefreshCourier(pkg._id)}
                                                        disabled={busy}
                                                        className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-[var(--color-primary)] text-[var(--color-primary)] bg-white rounded-md text-xs font-bold hover:bg-gray-50 transition-all disabled:opacity-50"
                                                    >
                                                        <FiRefreshCw size={13} className={busy ? 'animate-spin' : ''} />
                                                        {busy ? 'Refreshing…' : 'Refresh status'}
                                                    </button>
                                                    <p className="text-[11px] text-gray-400">Editing after sending isn&apos;t supported — use the Steadfast panel.</p>
                                                </div>
                                            ) : UNSENDABLE_STATUSES.includes(pkg.status) ? (
                                                <p className="text-xs text-gray-400">This parcel is {getStatusConfig(pkg.status).label.toLowerCase()}, so it can&apos;t be sent to Steadfast.</p>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => openSendToSteadfast(pkg._id)}
                                                    disabled={isSending}
                                                    className="w-full py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold hover:bg-[var(--color-primary-dark)] transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    <FiSend size={16} />
                                                    Send to Steadfast
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {legacyTracking && (
                                <p className={`text-[11px] text-gray-500 ${packages.length > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                                    Legacy tracking: <span className="font-mono text-gray-700">{legacyTracking}</span>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <PrintOrdersModal
                job={printKind ? { kind: printKind, ids: [order._id] } : null}
                onClose={() => setPrintKind(null)}
            />

            {isEditing && !editBlocked && (
                <EditOrderModal order={order} onClose={() => setIsEditing(false)} />
            )}

            {!isEditor && sendPkg && (
                <SendToSteadfastModal
                    order={order}
                    pkg={sendPkg}
                    title={`Order ${order.orderId || order.orderNumber}${packages.length > 1 ? ` · Package ${packages.indexOf(sendPkg) + 1}` : ''}`}
                    sending={isSending}
                    error={sendError}
                    onCancel={closeSendToSteadfast}
                    onConfirm={handleSendToSteadfast}
                />
            )}
        </div>
    );
}

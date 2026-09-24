import {
    FiClock,
    FiCheckCircle,
    FiPackage,
    FiTruck,
    FiNavigation,
    FiAlertCircle,
    FiXCircle,
    FiRotateCcw,
    FiDollarSign,
    FiEdit2,
    FiFileText,
} from 'react-icons/fi';
import type { ElementType } from 'react';

export interface OrderStatusConfig {
    label: string;
    badgeBg: string;
    badgeText: string;
    dot: string;
    icon: ElementType;
}

// ===== Single source of truth for the 11-state order lifecycle =====
export const ORDER_STATUS_CONFIG: Record<string, OrderStatusConfig> = {
    pending: {
        label: 'Pending',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700',
        dot: 'bg-amber-500',
        icon: FiClock,
    },
    confirmed: {
        label: 'Confirmed',
        badgeBg: 'bg-blue-50',
        badgeText: 'text-blue-700',
        dot: 'bg-blue-500',
        icon: FiCheckCircle,
    },
    processing: {
        label: 'Processing',
        badgeBg: 'bg-purple-50',
        badgeText: 'text-purple-700',
        dot: 'bg-purple-500',
        icon: FiPackage,
    },
    shipped: {
        label: 'Shipped',
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-700',
        dot: 'bg-indigo-500',
        icon: FiTruck,
    },
    on_the_way: {
        label: 'On The Way',
        badgeBg: 'bg-sky-50',
        badgeText: 'text-sky-700',
        dot: 'bg-sky-500',
        icon: FiNavigation,
    },
    out_for_delivery: {
        label: 'Out For Delivery',
        badgeBg: 'bg-teal-50',
        badgeText: 'text-teal-700',
        dot: 'bg-teal-500',
        icon: FiTruck,
    },
    delivery_attempt: {
        label: 'Delivery Attempt',
        badgeBg: 'bg-orange-50',
        badgeText: 'text-orange-700',
        dot: 'bg-orange-500',
        icon: FiAlertCircle,
    },
    delivered: {
        label: 'Delivered',
        badgeBg: 'bg-emerald-50',
        badgeText: 'text-emerald-700',
        dot: 'bg-emerald-500',
        icon: FiCheckCircle,
    },
    cancelled: {
        label: 'Cancelled',
        badgeBg: 'bg-red-50',
        badgeText: 'text-red-700',
        dot: 'bg-red-500',
        icon: FiXCircle,
    },
    returned: {
        label: 'Returned',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        dot: 'bg-gray-500',
        icon: FiRotateCcw,
    },
    refunded: {
        label: 'Refunded',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700',
        dot: 'bg-rose-500',
        icon: FiDollarSign,
    },
};

/**
 * Things that happen TO an order rather than states it is in. They are written into the
 * timeline alongside the statuses, so the Activity Log needs labels for them — but they
 * are not statuses, and the status dropdowns are built by walking ORDER_STATUS_CONFIG,
 * which is why they live in their own map.
 */
const TIMELINE_EVENT_CONFIG: Record<string, OrderStatusConfig> = {
    order_edited: {
        label: 'Order Edited',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        dot: 'bg-gray-400',
        icon: FiEdit2,
    },
    admin_note: {
        label: 'Note Added',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        dot: 'bg-gray-400',
        icon: FiFileText,
    },
    payment_paid: { label: 'Payment Received', badgeBg: 'bg-green-50', badgeText: 'text-green-700', dot: 'bg-green-500', icon: FiDollarSign },
    payment_pending: { label: 'Payment Pending', badgeBg: 'bg-amber-50', badgeText: 'text-amber-700', dot: 'bg-amber-500', icon: FiDollarSign },
    payment_failed: { label: 'Payment Failed', badgeBg: 'bg-rose-50', badgeText: 'text-rose-700', dot: 'bg-rose-500', icon: FiDollarSign },
    payment_refunded: { label: 'Payment Refunded', badgeBg: 'bg-rose-50', badgeText: 'text-rose-700', dot: 'bg-rose-500', icon: FiDollarSign },
};

// Sane default for unknown/legacy statuses
const DEFAULT_STATUS_CONFIG: OrderStatusConfig = {
    label: 'Unknown',
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-700',
    dot: 'bg-gray-400',
    icon: FiClock,
};

// Forward progress chain (steppers / "least-advanced wins")
export const FORWARD_STEPS: string[] = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'on_the_way',
    'out_for_delivery',
    'delivery_attempt',
    'delivered',
];

// Label map for the forward steps (reuses config labels)
export const FORWARD_STEP_LABELS: Record<string, string> = FORWARD_STEPS.reduce(
    (acc, key) => {
        acc[key] = ORDER_STATUS_CONFIG[key]?.label ?? key;
        return acc;
    },
    {} as Record<string, string>,
);

export function getStatusConfig(status: string): OrderStatusConfig {
    return ORDER_STATUS_CONFIG[status] ?? TIMELINE_EVENT_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
}

// Index within FORWARD_STEPS (-1 for terminal/branch states)
export function statusProgressIndex(status: string): number {
    return FORWARD_STEPS.indexOf(status);
}

// ===== Payment method labels & badges =====
export function paymentMethodLabel(method: string): string {
    switch ((method || '').toLowerCase()) {
        case 'bkash':
            return 'bKash';
        case 'sslcommerz':
            return 'SSLCommerz';
        case 'cod':
            return 'Cash on Delivery';
        case 'rocket':
            return 'Rocket';
        case 'nagad':
            return 'Nagad';
        case 'bank':
            return 'Bank transfer';
        default:
            return (method || '').toUpperCase();
    }
}

export interface PaymentMethodBadge {
    bg: string;
    color: string;
}

export const paymentMethodBadge: Record<string, PaymentMethodBadge> = {
    bkash: { bg: '#fdeef4', color: '#e2136e' },
    sslcommerz: { bg: '#eef6ff', color: '#1f5fbf' },
    cod: { bg: '#eefcf3', color: '#0f9d58' },
    rocket: { bg: '#f3eefb', color: '#8c3ec0' },
    nagad: { bg: '#fdeeee', color: '#ed1c24' },
    bank: { bg: '#ecfdf5', color: '#0f766e' },
};

// ===== Steadfast courier status (the raw delivery_status Steadfast reports) =====

/** "in_review" → "In review", "partial_delivered" → "Partial delivered". */
export function courierStatusLabel(raw?: string): string {
    const text = (raw || '').trim().replace(/[_-]+/g, ' ').toLowerCase();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not synced yet';
}

/**
 * Badge classes for a Steadfast delivery_status: waiting on the courier → amber,
 * delivered → green, cancelled / returned → red, anything still moving → blue,
 * unknown / not synced → grey.
 */
export function courierStatusBadgeClass(raw?: string): string {
    const v = (raw || '').trim().toLowerCase();
    if (v === 'delivered' || v === 'partial_delivered') return 'bg-emerald-50 text-emerald-700';
    if (v.startsWith('cancelled') || v.startsWith('returned')) return 'bg-red-50 text-red-700';
    if (v === 'in_review' || v === 'pending' || v === 'hold') return 'bg-amber-50 text-amber-700';
    if (!v || v === 'unknown') return 'bg-gray-100 text-gray-600';
    return 'bg-blue-50 text-blue-700';
}

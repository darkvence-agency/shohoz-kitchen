"use client";

import React from 'react';
import {
    FiX, FiTruck, FiMapPin, FiPhone, FiUser, FiPackage,
    FiDollarSign, FiAlertTriangle, FiFileText,
} from 'react-icons/fi';
import type { ICourierPackage } from '@/redux/api/courierApi';

interface Props {
    pkg: ICourierPackage | null;
    isBooking: boolean;
    onClose: () => void;
    onConfirm: (pkg: ICourierPackage) => void;
}

// Build the exact delivery address the server sends to Steadfast:
//   [address, area, city, postalCode].filter(Boolean).join(', ')
function fullAddress(p: ICourierPackage) {
    return [p.address, p.area, p.city, p.postalCode].filter(Boolean).join(', ') || '—';
}

/**
 * BookCourierModal — one-click booking confirmation.
 * Shows exactly what will be sent to Steadfast (recipient, address, COD, parcel)
 * so the admin can review before creating a real consignment. The parent owns the
 * mutation; this component is purely presentational and reusable across the courier
 * board and the order-detail page.
 */
export default function BookCourierModal({ pkg, isBooking, onClose, onConfirm }: Props) {
    if (!pkg) return null;
    const isCod = pkg.codAmount > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={isBooking ? undefined : onClose}
            />

            {/* Dialog */}
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#4F46E5] text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                            <FiTruck size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold leading-tight">Book courier</h3>
                            <p className="text-xs text-white/80">Order {pkg.orderNo} · via Steadfast</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isBooking}
                        className="p-2 rounded-lg hover:bg-white/15 disabled:opacity-40"
                        aria-label="Close"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <p className="text-sm text-gray-500">
                        Review the parcel below and confirm. Steadfast will pick it up and deliver to the customer.
                    </p>

                    {/* Recipient */}
                    <div className="rounded-xl border border-gray-200 p-4 space-y-2.5">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Deliver to</p>
                        <div className="flex items-center gap-2.5 text-sm text-gray-800">
                            <FiUser size={15} className="text-gray-400 shrink-0" />
                            <span className="font-semibold">{pkg.customer || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-gray-600">
                            <FiPhone size={15} className="text-gray-400 shrink-0" />
                            {pkg.phone || '—'}
                        </div>
                        <div className="flex items-start gap-2.5 text-sm text-gray-600">
                            <FiMapPin size={15} className="text-gray-400 shrink-0 mt-0.5" />
                            <span>{fullAddress(pkg)}</span>
                        </div>
                    </div>

                    {/* Parcel */}
                    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Parcel</p>
                            <span className="text-xs text-gray-500">{pkg.shopName || 'Shohoz Kitchen (Official)'}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {pkg.items?.slice(0, 4).map((it, i) =>
                                it.thumbnail ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={it.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border" />
                                ) : (
                                    <div key={i} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <FiPackage size={16} className="text-gray-300" />
                                    </div>
                                )
                            )}
                            <span className="text-sm text-gray-600 ml-1">
                                {pkg.itemCount} item{pkg.itemCount > 1 ? 's' : ''}
                            </span>
                        </div>
                        {pkg.note ? (
                            <div className="flex items-start gap-2 text-xs text-gray-500 pt-1 border-t border-gray-100">
                                <FiFileText size={13} className="shrink-0 mt-0.5" />
                                <span>{pkg.note}</span>
                            </div>
                        ) : null}
                    </div>

                    {/* COD — money-critical, highlighted */}
                    <div
                        className={`rounded-xl p-4 flex items-center justify-between ${isCod ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 border border-gray-200'
                            }`}
                    >
                        <div className="flex items-center gap-2.5">
                            <FiDollarSign size={18} className={isCod ? 'text-emerald-600' : 'text-gray-400'} />
                            <span className={`text-sm font-semibold ${isCod ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {isCod ? 'Cash to collect (COD)' : 'Prepaid — nothing to collect'}
                            </span>
                        </div>
                        <span className={`text-lg font-extrabold ${isCod ? 'text-emerald-700' : 'text-gray-400'}`}>
                            ৳{(isCod ? pkg.codAmount : 0).toLocaleString()}
                        </span>
                    </div>

                    {/* Irreversibility notice */}
                    <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                        <FiAlertTriangle size={14} className="shrink-0 mt-0.5" />
                        <span>
                            This creates a real Steadfast consignment. The parcel will be marked <b>Shipped</b>.
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/60">
                    <button
                        onClick={onClose}
                        disabled={isBooking}
                        className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(pkg)}
                        disabled={isBooking}
                        className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] flex items-center gap-2 disabled:opacity-60"
                    >
                        <FiTruck size={16} className={isBooking ? 'animate-pulse' : ''} />
                        {isBooking ? 'Booking…' : 'Confirm & Book'}
                    </button>
                </div>
            </div>
        </div>
    );
}

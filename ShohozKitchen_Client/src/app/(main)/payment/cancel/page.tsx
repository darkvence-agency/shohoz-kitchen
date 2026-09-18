"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiSlash, FiRefreshCw, FiShoppingCart, FiPackage } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useRetryPaymentMutation } from '@/redux/api/paymentApi';

const PaymentCancelInner = () => {
    const params = useSearchParams();
    const txn = params.get('txn') || '';
    const [retryPayment, { isLoading }] = useRetryPaymentMutation();
    const [redirecting, setRedirecting] = useState(false);

    const handleRetry = async () => {
        if (!txn) {
            toast.error('Missing transaction reference. Please retry from My Payments.');
            return;
        }
        try {
            const res = await retryPayment(txn).unwrap();
            const redirectUrl = res?.data?.redirectUrl;
            if (redirectUrl) {
                setRedirecting(true);
                window.location.href = redirectUrl;
                return;
            }
            toast.error('Could not restart payment. Please try again from My Payments.');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Could not restart payment. Please try again.');
        }
    };

    const busy = isLoading || redirecting;

    return (
        <div className="bg-gray-50/50 min-h-screen flex items-center justify-center py-16 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8 sm:p-10 text-center">
                <div className="w-20 h-20 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-6">
                    <FiSlash size={40} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Cancelled</h1>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    You cancelled the payment before it was completed. Your order is still saved and nothing was charged.
                    You can complete the payment whenever you&apos;re ready.
                </p>

                {txn && (
                    <div className="text-left bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Transaction</span>
                            <span className="font-mono text-xs text-gray-600 break-all max-w-[60%] text-right">{txn}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleRetry}
                        disabled={busy}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {busy ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Restarting…
                            </>
                        ) : (
                            <>
                                <FiRefreshCw size={16} />
                                Retry Payment
                            </>
                        )}
                    </button>
                    <Link
                        href="/dashboard/user/payments"
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
                    >
                        <FiPackage size={16} />
                        My Payments
                    </Link>
                    <Link
                        href="/cart"
                        className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-gray-700 font-medium text-sm transition-all"
                    >
                        <FiShoppingCart size={15} />
                        Back to Cart
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default function PaymentCancelPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>}>
            <PaymentCancelInner />
        </Suspense>
    );
}

"use client";

import React, { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FiCheckCircle, FiPackage, FiShoppingBag, FiClock, FiAlertCircle } from 'react-icons/fi';
import { useVerifyPaymentQuery } from '@/redux/api/paymentApi';
import { useAppDispatch } from '@/redux';
import { clearCart } from '@/redux/slices/cartSlice';

const COUPON_STORAGE_KEY = 'shohozkitchen_applied_coupon';

const PaymentSuccessInner = () => {
    const params = useSearchParams();
    const txn = params.get('txn') || '';
    const dispatch = useAppDispatch();

    const { data, isLoading, isError } = useVerifyPaymentQuery(txn, { skip: !txn });

    // The cart should already be empty (checkout clears it), but make sure —
    // a paid order must never leave items lingering behind.
    useEffect(() => {
        dispatch(clearCart());
        try { localStorage.removeItem(COUPON_STORAGE_KEY); } catch {}
    }, [dispatch]);

    const transaction = data?.data?.transaction;
    const order = data?.data?.order;
    const orderPaymentStatus: string | undefined = data?.data?.orderPaymentStatus;
    const txnStatus: string | undefined = transaction?.status;

    const isPaid = txnStatus === 'success' || orderPaymentStatus === 'paid';
    const isPending = !isPaid && (txnStatus === 'pending' || txnStatus === 'initiated');

    const orderId = order?._id || transaction?.order;
    const amount = transaction?.amount;

    return (
        <div className="bg-gray-50/50 min-h-screen flex items-center justify-center py-16 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 p-8 sm:p-10 text-center">

                {isLoading ? (
                    <div className="py-10">
                        <span className="inline-block w-12 h-12 border-4 border-gray-100 border-t-[var(--color-primary)] rounded-full animate-spin" />
                        <p className="mt-6 text-sm font-medium text-gray-400">Confirming your payment…</p>
                    </div>
                ) : (
                    <>
                        {/* Icon */}
                        <div
                            className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 ${
                                isPaid ? 'bg-emerald-50 text-emerald-500'
                                : isPending ? 'bg-amber-50 text-amber-500'
                                : 'bg-blue-50 text-blue-500'
                            }`}
                        >
                            {isPaid ? <FiCheckCircle size={42} />
                                : isPending ? <FiClock size={42} />
                                : <FiAlertCircle size={42} />}
                        </div>

                        {/* Heading */}
                        <h1 className="text-2xl font-bold text-gray-900 mb-3">
                            {isPaid ? 'Payment Successful!'
                                : isPending ? 'Payment Processing'
                                : 'Order Placed'}
                        </h1>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6">
                            {isPaid
                                ? 'Your order has been placed and your payment is confirmed. A confirmation will be sent to you shortly.'
                                : isPending
                                    ? 'Your order is placed. We are still confirming your payment — it will update automatically once your bank confirms it.'
                                    : isError || !txn
                                        ? 'Your order has been placed. We could not confirm the payment status right now — you can check it any time under My Payments.'
                                        : 'Your order has been placed. You can track the payment under My Payments.'}
                        </p>

                        {/* Receipt summary */}
                        {(amount != null || txn) && (
                            <div className="text-left bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 mb-6 space-y-2">
                                {amount != null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Amount</span>
                                        <span className="font-bold text-gray-900">৳{Number(amount).toLocaleString()}</span>
                                    </div>
                                )}
                                {transaction?.method && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Method</span>
                                        <span className="font-semibold text-gray-700 uppercase">{transaction.method}</span>
                                    </div>
                                )}
                                {txn && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Transaction</span>
                                        <span className="font-mono text-xs text-gray-600 break-all max-w-[60%] text-right">{txn}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="space-y-3">
                            <Link
                                href={orderId ? `/dashboard/user/orders/${orderId}` : '/dashboard/user/orders'}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:brightness-95 transition-all"
                            >
                                <FiPackage size={16} />
                                View My Order
                            </Link>
                            <Link
                                href="/"
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
                            >
                                <FiShoppingBag size={16} />
                                Continue Shopping
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>}>
            <PaymentSuccessInner />
        </Suspense>
    );
}

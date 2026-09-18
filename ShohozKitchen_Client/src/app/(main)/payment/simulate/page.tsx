"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FiLock, FiCheck, FiX, FiZap } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useConfirmSimulatedPaymentMutation } from '@/redux/api/paymentApi';

const methodLabel = (m: string) =>
    ({ bkash: 'bKash', sslcommerz: 'SSLCommerz', cod: 'Cash on Delivery' } as Record<string, string>)[m] || (m || 'Gateway').toUpperCase();

const PaymentSimulateInner = () => {
    const params = useSearchParams();
    const router = useRouter();
    const txn = params.get('txn') || '';
    const method = params.get('method') || '';
    const amount = params.get('amount') || '';

    const [confirmSimulated, { isLoading }] = useConfirmSimulatedPaymentMutation();
    const [pending, setPending] = useState<'success' | 'cancel' | null>(null);

    const run = async (outcome: 'success' | 'cancel') => {
        if (!txn) {
            toast.error('Missing transaction reference.');
            return;
        }
        setPending(outcome);
        try {
            await confirmSimulated({ transactionId: txn, outcome }).unwrap();
            if (outcome === 'success') {
                router.push(`/payment/success?txn=${encodeURIComponent(txn)}`);
            } else {
                router.push(`/payment/cancel?txn=${encodeURIComponent(txn)}`);
            }
        } catch (err: any) {
            toast.error(err?.data?.message || 'Could not process the simulated payment.');
            setPending(null);
        }
    };

    const busy = isLoading;
    const amountNum = amount ? Number(amount) : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FFF4EE] to-gray-50 flex items-center justify-center py-12 px-4">
            <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-[var(--color-primary-border)]/40 overflow-hidden">

                {/* Branded header */}
                <div className="bg-[var(--color-primary)] px-6 py-5 text-white text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <FiZap size={18} />
                        <span className="font-bold text-lg tracking-tight">Shohoz Kitchen Pay</span>
                    </div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                        Sandbox / Test Gateway
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-7">
                    {/* Dev notice */}
                    <div className="mb-5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2.5">
                        <FiLock size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] leading-relaxed text-amber-700">
                            This is a simulated gateway for testing. No real money will move. Choose an outcome below.
                        </p>
                    </div>

                    {/* Amount */}
                    <div className="text-center mb-6">
                        <p className="text-xs text-gray-400 mb-1">Amount to pay via {methodLabel(method)}</p>
                        <p className="text-4xl font-black text-gray-900">
                            ৳{amountNum != null && !Number.isNaN(amountNum) ? amountNum.toLocaleString() : '—'}
                        </p>
                    </div>

                    {/* Details */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-6 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Method</span>
                            <span className="font-semibold text-gray-700">{methodLabel(method)}</span>
                        </div>
                        {txn && (
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Transaction</span>
                                <span className="font-mono text-[11px] text-gray-600 break-all max-w-[60%] text-right">{txn}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={() => run('success')}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm hover:brightness-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {busy && pending === 'success' ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing…
                                </>
                            ) : (
                                <>
                                    <FiCheck size={16} />
                                    Pay Now ৳{amountNum != null && !Number.isNaN(amountNum) ? amountNum.toLocaleString() : ''}
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => run('cancel')}
                            disabled={busy}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:border-red-300 hover:text-red-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {busy && pending === 'cancel' ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                                    Cancelling…
                                </>
                            ) : (
                                <>
                                    <FiX size={16} />
                                    Cancel Payment
                                </>
                            )}
                        </button>
                    </div>

                    <p className="mt-5 text-center text-[10px] text-gray-300 flex items-center justify-center gap-1">
                        <FiLock size={10} /> Secured test environment
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function PaymentSimulatePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">Loading gateway…</div>}>
            <PaymentSimulateInner />
        </Suspense>
    );
}

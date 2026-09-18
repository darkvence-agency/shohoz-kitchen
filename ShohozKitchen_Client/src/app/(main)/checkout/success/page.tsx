"use client";

import React from 'react';
import Link from 'next/link';
import { FiCheckCircle, FiPackage, FiArrowRight, FiShoppingBag } from 'react-icons/fi';

const SuccessPage = () => {
    return (
        <div className="bg-gray-50/50 min-h-screen flex items-center justify-center py-20 px-4">
            <div className="max-w-md w-full bg-white rounded-md border border-gray-100 shadow-2xl shadow-gray-200/50 p-10 text-center animate-fadeIn">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-md flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
                    <FiCheckCircle size={48} />
                </div>

                <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Order Successful!</h1>
                <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                    Thank you for your purchase. Your order has been placed and is being processed. You will receive an email confirmation shortly.
                </p>

                <div className="space-y-4">
                    <Link
                        href="/"
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 text-white rounded-md font-bold text-sm tracking-widest hover:bg-[var(--color-primary)] transition-all shadow-xl shadow-gray-200 hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] group"
                    >
                        Continue Shopping
                        <FiShoppingBag className="group-hover:translate-x-1 transition-transform" />
                    </Link>

                    <Link
                        href="/dashboard/user/orders"
                        className="w-full flex items-center justify-center gap-3 py-4 bg-white border border-gray-100 text-gray-700 rounded-md font-bold text-sm tracking-widest hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] group"
                    >
                        View My Orders
                        <FiPackage className="group-hover:rotate-12 transition-transform" />
                    </Link>
                </div>

                <p className="mt-10 text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    Order Tracking ID: <span className="text-gray-900">MG-{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                </p>
            </div>

            <style jsx>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default SuccessPage;

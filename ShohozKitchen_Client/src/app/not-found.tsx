"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import {
    FiHome,
    FiArrowLeft,
    FiShoppingBag,
    FiHelpCircle,
    FiZap,
    FiCompass,
    FiLayout,
} from 'react-icons/fi';
import Logo from '@/components/shared/Logo';

export default function NotFound() {
    const router = useRouter();
    const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

    const getDashboardHref = () => {
        if (!user) return '/';
        if (user.role === 'admin' || user.role === 'superadmin') return '/dashboard/admin';
        return '/dashboard/user';
    };

    const getDashboardLabel = () => {
        if (!user) return 'Back to Home';
        if (user.role === 'admin' || user.role === 'superadmin') return 'Admin Dashboard';
        return 'My Account';
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-[var(--color-primary)] selection:text-white">
            {/* Ambient Background Glows */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-green-700/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/3 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Subtle Grid Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                    backgroundSize: '32px 32px',
                }}
            />

            {/* Header */}
            <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
                <Link href="/" className="inline-flex items-center gap-2 hover:opacity-95 transition-opacity">
                    <Logo size={36} light />
                </Link>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all shadow-sm"
                    >
                        <FiArrowLeft size={14} /> Back
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white transition-all shadow-md shadow-[var(--color-primary)]/20"
                    >
                        <FiHome size={14} /> Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
                <div className="max-w-2xl w-full text-center">
                    {/* Glowing 404 Badge & Numbers */}
                    <div className="relative inline-block mb-6 select-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600/30 to-amber-500/30 blur-2xl rounded-full scale-110" />
                        <div className="relative text-7xl sm:text-9xl font-black tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent drop-shadow-2xl">
                            4<span className="text-green-600">0</span>4
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/40 text-[11px] font-bold text-[var(--color-secondary)] uppercase tracking-widest backdrop-blur-md">
                            Lost in Space
                        </div>
                    </div>

                    {/* Headline & Description */}
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                        Oops! Page Not Found
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto leading-relaxed mb-8">
                        The page you were looking for doesn&apos;t exist, was moved to another URL, or has been temporarily removed.
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
                        {isAuthenticated && user && (
                            <Link
                                href={getDashboardHref()}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <FiLayout size={16} />
                                {getDashboardLabel()}
                            </Link>
                        )}
                        <Link
                            href="/"
                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${
                                isAuthenticated
                                    ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700'
                                    : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white shadow-lg shadow-[var(--color-primary)]/25'
                            }`}
                        >
                            <FiHome size={16} />
                            Go to Homepage
                        </Link>
                        <Link
                            href="/products"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-bold text-sm transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <FiShoppingBag size={16} />
                            Browse Products
                        </Link>
                    </div>

                    {/* Quick Helpful Destinations */}
                    <div className="pt-8 border-t border-slate-900 max-w-xl mx-auto">
                        <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
                            Helpful Destinations
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            <Link
                                href="/products"
                                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-[var(--color-primary)]/40 text-slate-300 hover:text-[var(--color-secondary)] transition-all group"
                            >
                                <FiShoppingBag size={18} className="mb-1.5 text-slate-400 group-hover:text-[var(--color-secondary)] transition-colors" />
                                <span className="text-xs font-semibold">Catalog</span>
                            </Link>
                            <Link
                                href="/products?isOnSale=true"
                                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-[var(--color-primary)]/40 text-slate-300 hover:text-[var(--color-secondary)] transition-all group"
                            >
                                <FiZap size={18} className="mb-1.5 text-slate-400 group-hover:text-[var(--color-secondary)] transition-colors" />
                                <span className="text-xs font-semibold">Flash Deals</span>
                            </Link>

                            <Link
                                href="/contact"
                                className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-[var(--color-primary)]/40 text-slate-300 hover:text-[var(--color-secondary)] transition-all group"
                            >
                                <FiHelpCircle size={18} className="mb-1.5 text-slate-400 group-hover:text-[var(--color-secondary)] transition-colors" />
                                <span className="text-xs font-semibold">Support</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 text-center text-xs text-slate-400 border-t border-slate-900">
                <p>&copy; {new Date().getFullYear()} Shohoz Kitchen. All rights reserved.</p>
            </footer>
        </div>
    );
}

"use client";

import React from 'react';
import Link from 'next/link';
import { FiArrowRight, FiShoppingBag } from 'react-icons/fi';

// The home page's closing call to action: one way forward, into the catalogue.
// (It used to invite people to "Become a Seller" — this is a single store.)
const CtaBanner: React.FC = () => {
    return (
        <section className="w-full relative overflow-hidden">
            {/* Background — indigo gradient */}
            <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(120deg, var(--color-primary) 0%, var(--color-primary-dark) 55%, var(--color-primary) 100%)' }}
            />
            {/* Decorative blobs */}
            <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/[0.06]" />
            <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-white/[0.05]" />

            {/* Content */}
            <div className="relative container mx-auto px-4 py-16 text-center">
                <span className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold tracking-[0.18em] uppercase text-white/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Shop Shohoz Kitchen
                </span>

                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 tracking-tight">
                    Everything your kitchen needs
                </h2>
                <p className="text-sm md:text-base text-white/75 mb-8 max-w-xl mx-auto leading-relaxed">
                    Cookware, dinnerware and kitchen tools at honest prices — delivered to your door anywhere in Bangladesh.
                </p>

                <Link
                    href="/products"
                    className="inline-flex items-center justify-center gap-2 bg-white text-[var(--color-primary)] font-bold text-sm px-8 py-3.5 rounded-md hover:bg-slate-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto"
                >
                    <FiShoppingBag size={16} /> Shop all products <FiArrowRight size={16} />
                </Link>
            </div>
        </section>
    );
};

export default CtaBanner;

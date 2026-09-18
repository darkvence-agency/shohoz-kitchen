"use client";

import React from 'react';
import { FiGlobe, FiShield, FiLock, FiTruck, FiRefreshCw, FiEye } from 'react-icons/fi';

const features = [
    {
        icon: FiGlobe,
        title: 'Worldwide Purchase',
        desc: 'No boundaries — buy from sellers around the world.',
    },
    {
        icon: FiShield,
        title: 'Verified Sellers',
        desc: 'Every seller is vetted so you always get quality products.',
    },
    {
        icon: FiLock,
        title: 'Safe Payments',
        desc: 'Bank-grade security on every transaction, every time.',
    },
    {
        icon: FiTruck,
        title: 'Fast Delivery',
        desc: 'Optimized logistics so your order arrives quickly.',
    },
    {
        icon: FiRefreshCw,
        title: 'Easy Refunds',
        desc: 'Hassle-free refunds whenever something is not right.',
    },
    {
        icon: FiEye,
        title: 'Full Transparency',
        desc: 'Clarity, accountability, and ethical business at every step.',
    },
];

const QualityFeatures: React.FC = () => {
    return (
        <section className="w-full">
            <div className="container mx-auto px-2 py-12">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">

                    {/* Header — centered kicker + title + subtitle */}
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="h-px w-8 bg-[var(--color-primary)]/30" />
                            <span className="text-[11px] font-semibold tracking-[0.25em] text-[var(--color-primary)] uppercase">
                                Why Choose Us
                            </span>
                            <span className="h-px w-8 bg-[var(--color-primary)]/30" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                            Quality Choices, Affordable Prices
                        </h2>
                        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                            Why thousands of customers trust Shohoz Kitchen for their shopping needs.
                        </p>
                    </div>

                    {/* Feature Cards — minimal, monochrome */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {features.map((item, idx) => (
                            <div
                                key={idx}
                                className="group relative flex flex-col items-center text-center bg-white border border-gray-100 rounded-2xl p-5 transition-all duration-300 hover:border-[var(--color-primary)]/30 hover:shadow-md hover:-translate-y-0.5"
                            >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-slate-50 text-slate-700 transition-colors duration-300 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)]">
                                    <item.icon size={22} />
                                </div>
                                <h4 className="text-[13px] font-bold text-gray-900 mb-1">
                                    {item.title}
                                </h4>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default QualityFeatures;

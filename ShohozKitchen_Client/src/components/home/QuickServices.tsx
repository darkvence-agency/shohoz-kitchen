"use client";

import React from 'react';
import Link from 'next/link';

interface QuickServicesProps {
    onCategoryClick: () => void;
}

const services = [
    {
        icon: '🟧',
        emoji: (
            <span className="text-4xl leading-none select-none">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="16" height="16" rx="3" fill="#F59E0B" />
                    <rect x="28" y="4" width="16" height="16" rx="3" fill="#F59E0B" opacity="0.7" />
                    <rect x="4" y="28" width="16" height="16" rx="3" fill="#F59E0B" opacity="0.7" />
                    <rect x="28" y="28" width="16" height="16" rx="3" fill="#F59E0B" opacity="0.5" />
                    <circle cx="36" cy="12" r="6" fill="#FBBF24" />
                    <path d="M33 12 L35 14 L39 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        ),
        label: 'Category',
        href: '/category',
    },
    {
        emoji: (
            <span className="text-4xl leading-none select-none">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="20" width="20" height="14" rx="3" fill="#3B82F6" />
                    <rect x="10" y="22" width="16" height="10" rx="2" fill="#BFDBFE" />
                    <path d="M28 24 L40 16 L40 32 Z" fill="#60A5FA" />
                    <circle cx="36" cy="10" r="7" fill="#F59E0B" />
                    <path d="M33 10 L35 12 L39 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        ),
        label: 'Ship for me request',
        href: '/ship-for-me',
    },
    {
        emoji: (
            <span className="text-4xl leading-none select-none">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="24" cy="24" r="20" fill="#FEE2E2" />
                    <circle cx="24" cy="24" r="14" fill="#FECACA" />
                    <circle cx="24" cy="24" r="8" fill="#EF4444" />
                    <circle cx="24" cy="24" r="3" fill="white" />
                    <path d="M35 6 L38 2 L42 6 L38 10 Z" fill="#F59E0B" />
                    <line x1="38" y1="10" x2="30" y2="16" stroke="#F59E0B" strokeWidth="1.5" />
                </svg>
            </span>
        ),
        label: 'Request for quotations',
        href: '/quotations',
    },
    {
        emoji: (
            <span className="text-4xl leading-none select-none">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="24" cy="30" rx="10" ry="6" fill="#FDE68A" />
                    <path d="M14 22 Q14 10 24 10 Q34 10 34 22 Q34 28 28 30 L20 30 Q14 28 14 22 Z" fill="#FCD34D" />
                    <path d="M20 30 L20 36 L28 36 L28 30" fill="#F59E0B" />
                    <line x1="22" y1="36" x2="26" y2="36" stroke="#D97706" strokeWidth="2" />
                    <circle cx="24" cy="20" r="3" fill="#F59E0B" opacity="0.6" />
                    <line x1="24" y1="4" x2="24" y2="7" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="34" y1="7" x2="32" y2="9" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="14" y1="7" x2="16" y2="9" stroke="#FCD34D" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </span>
        ),
        label: 'Talk to the expert',
        href: '/expert',
    },
    {
        emoji: (
            <span className="text-4xl leading-none select-none">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <ellipse cx="22" cy="26" rx="14" ry="16" fill="#22C55E" />
                    <ellipse cx="22" cy="26" rx="10" ry="12" fill="#16A34A" />
                    <text x="17" y="30" fontSize="12" fill="white" fontWeight="bold">$</text>
                    <rect x="30" y="22" width="14" height="18" rx="3" fill="#3B82F6" />
                    <rect x="32" y="24" width="4" height="3" rx="1" fill="white" opacity="0.8" />
                    <rect x="38" y="24" width="4" height="3" rx="1" fill="white" opacity="0.8" />
                    <rect x="32" y="29" width="4" height="3" rx="1" fill="white" opacity="0.8" />
                    <rect x="38" y="29" width="4" height="3" rx="1" fill="white" opacity="0.8" />
                    <rect x="35" y="34" width="4" height="6" rx="1" fill="white" opacity="0.8" />
                </svg>
            </span>
        ),
        label: 'Cost Calculator',
        href: '/cost-calculator',
    },
    {
        emoji: (
            <span className="text-4xl leading-none select-none">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 40 C24 40 6 28 6 17 C6 11 10.5 7 16 7 C19.5 7 22.5 8.8 24 11.5 C25.5 8.8 28.5 7 32 7 C37.5 7 42 11 42 17 C42 28 24 40 24 40 Z" fill="#FB7185" />
                    <path d="M24 36 C24 36 10 26 10 17.5 C10 13 13 10 16.5 10 C19 10 21 11.5 22.5 13.5" fill="#F43F5E" opacity="0.5" />
                    <circle cx="34" cy="10" r="5" fill="#FCD34D" />
                    <path d="M32 10 L33.5 11.5 L36.5 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        ),
        label: 'Wish List',
        href: '/dashboard/user/wishlist',
    },
];

const QuickServices: React.FC<QuickServicesProps> = ({ onCategoryClick }) => {
    return (
        <section className="w-full bg-white py-7 px-6">
            <div className="max-w-6xl mx-auto">
                {/* 6-column grid: 3 cols mobile → 6 cols desktop */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {services.map((service) => {
                        const cardClass =
                            'flex flex-col items-center justify-center gap-3 bg-white border border-gray-100 rounded-2xl py-6 px-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-[var(--color-primary-border)] transition-all duration-200 group cursor-pointer';

                        if (service.label === 'Category') {
                            return (
                                <button
                                    key={service.label}
                                    onClick={onCategoryClick}
                                    className={cardClass}
                                >
                                    <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-amber-50 group-hover:scale-105 transition-transform duration-200">
                                        {service.emoji}
                                    </div>
                                    <span className="text-[13px] font-semibold text-gray-600 text-center leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                                        {service.label}
                                    </span>
                                </button>
                            );
                        }
                        return (
                            <Link
                                key={service.label}
                                href={service.href}
                                className={cardClass}
                            >
                                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-gray-50 group-hover:scale-105 transition-transform duration-200">
                                    {service.emoji}
                                </div>
                                <span className="text-[13px] font-semibold text-gray-600 text-center leading-tight group-hover:text-[var(--color-primary)] transition-colors">
                                    {service.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Global Shipping Services heading */}
                <div className="mt-5 text-center">
                    <h2 className="text-base font-bold text-gray-700 tracking-wide">
                        Global Shipping Services
                    </h2>
                </div>
            </div>
        </section>
    );
};

export default QuickServices;

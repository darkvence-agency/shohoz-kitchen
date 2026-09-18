"use client";

import React from 'react';

const partners = [
    { name: 'Ali', highlight: '2', suffix: 'BD', color: '#E43225' },
    { name: 'Shohoz', highlight: 'Drop', icon: 'drop', color: '#FF6B35' },
    { name: 'bc', highlight: ' BabyCart', color: '#6366f1' },
    { name: 'Shohoz', highlight: 'Up', icon: 'up', color: '#2563EB' },
    { name: 'Shohoz', highlight: 'Ship', icon: 'ship', color: '#0EA5E9' },
    { name: 'Shohoz', highlight: 'Pay', icon: 'pay', color: '#10B981' },
    { name: 'Shohoz', highlight: 'Trade', icon: 'trade', color: '#8B5CF6' },
    { name: 'Shohoz', highlight: 'Mart', icon: 'mart', color: '#F59E0B' },
    { name: 'Global', highlight: 'Source', color: '#EF4444' },
    { name: 'Shohoz', highlight: 'Express', icon: 'express', color: '#EC4899' },
];

const iconPaths: Record<string, string> = {
    drop: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    up: 'M7 14l5-5 5 5z',
    ship: 'M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.14.52-.05.78L3.95 19z',
    pay: 'M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z',
    trade: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    mart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0020.42 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    express: 'M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
};

const AssociatedProducts: React.FC = () => {
    // Triple for seamless infinite loop
    const displayPartners = [...partners, ...partners, ...partners];

    return (
        <section className="w-full bg-[var(--color-primary-lightest)] border-t border-[var(--color-primary)]/10">
            <div className="container mx-auto px-2 py-10">
                <h3 className="text-xl font-bold text-gray-900 text-center mb-8">
                    Shohoz Kitchen <span className="text-[var(--color-primary)]">Associated</span> Products
                </h3>
                <div className="associated-carousel-wrapper">
                    <div className="associated-carousel-track">
                        {displayPartners.map((p, idx) => (
                            <div key={`${p.name}-${idx}`} className="associated-carousel-item flex items-center gap-2 cursor-pointer group">
                                {p.icon && iconPaths[p.icon] && (
                                    <div
                                        className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                                        style={{ backgroundColor: p.color + '20' }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill={p.color}>
                                            <path d={iconPaths[p.icon]} />
                                        </svg>
                                    </div>
                                )}
                                <span className="text-lg font-bold text-gray-700 whitespace-nowrap group-hover:text-gray-900 transition-colors">
                                    {p.name}<span style={{ color: p.color }}>{p.highlight}</span>{p.suffix || ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AssociatedProducts;

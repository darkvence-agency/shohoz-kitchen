"use client";

import React from 'react';
import Link from 'next/link';
import { FiArrowRight } from 'react-icons/fi';

const CollectionBanners: React.FC = () => {
    return (
        <section className="section">
            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Banner - Large */}
                    <div className="relative group overflow-hidden rounded-md bg-[var(--color-primary)] p-8 md:p-12 h-80 md:h-96">
                        <div className="relative z-10 h-full flex flex-col justify-center">
                            <span className="text-white/80 text-sm font-medium mb-2">New Arrival</span>
                            <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                                Winter Collection<br />2026
                            </h3>
                            <p className="text-white/80 mb-6 max-w-sm">
                                Discover the latest trends in winter fashion with up to 50% off
                            </p>
                            <Link
                                href="/?collection=winter"
                                className="inline-flex items-center gap-2 bg-white text-[var(--color-primary)] px-6 py-3 rounded-md font-medium w-fit group-hover:shadow-lg transition-all"
                            >
                                Shop Now <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                        <div className="absolute right-0 bottom-0 text-[180px] opacity-20">
                            🧥
                        </div>
                    </div>

                    {/* Right Banners - Stacked */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Top Right Banner */}
                        <div className="relative group overflow-hidden rounded-md bg-[var(--color-accent)] p-6 md:p-8 h-44">
                            <div className="relative z-10 h-full flex flex-col justify-center">
                                <span className="text-white/80 text-sm font-medium mb-1">Hot Deals</span>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Electronics Sale
                                </h3>
                                <Link
                                    href="/?category=electronics"
                                    className="inline-flex items-center gap-2 text-white font-medium hover:underline"
                                >
                                    Explore <FiArrowRight />
                                </Link>
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-30">
                                📱
                            </div>
                        </div>

                        {/* Bottom Right Banner */}
                        <div className="relative group overflow-hidden rounded-md bg-[var(--color-secondary)] p-6 md:p-8 h-44">
                            <div className="relative z-10 h-full flex flex-col justify-center">
                                <span className="text-white/80 text-sm font-medium mb-1">Limited Time</span>
                                <h3 className="text-2xl font-bold text-white mb-2">
                                    Sports & Fitness
                                </h3>
                                <Link
                                    href="/?category=sports"
                                    className="inline-flex items-center gap-2 text-white font-medium hover:underline"
                                >
                                    Shop Now <FiArrowRight />
                                </Link>
                            </div>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-7xl opacity-30">
                                🏃
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CollectionBanners;

"use client";

import React from 'react';
import { FiTruck, FiHeadphones, FiRefreshCcw, FiLock } from 'react-icons/fi';

const features = [
    {
        id: 1,
        title: "Free Shipping",
        subtitle: "On all orders above $200",
        icon: FiTruck,
    },
    {
        id: 2,
        title: "24/7 Support",
        subtitle: "Contact us anytime",
        icon: FiHeadphones,
    },
    {
        id: 3,
        title: "30 Days Return",
        subtitle: "Easy return policy",
        icon: FiRefreshCcw,
    },
    {
        id: 4,
        title: "Secure Payment",
        subtitle: "100% secure payment",
        icon: FiLock,
    }
];

const Support: React.FC = () => {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-4 sm:px-8 md:px-12 lg:px-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 border border-gray-100 rounded-xl p-10 bg-gray-50/30 shadow-sm shadow-gray-100/50">
                    {features.map((item) => (
                        <div key={item.id} className="flex items-center gap-5 group transition-all">
                            <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm text-[var(--color-primary)] text-2xl group-hover:bg-[var(--color-primary)] group-hover:text-white group-hover:shadow-lg group-hover:border-[var(--color-primary)] transition-all duration-300">
                                <item.icon />
                            </div>
                            <div>
                                <h3 className="text-[16px] font-bold text-gray-900 leading-tight">
                                    {item.title}
                                </h3>
                                <p className="text-[13px] font-medium text-gray-400 mt-1.5 leading-relaxed">
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Support;

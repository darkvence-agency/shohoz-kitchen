import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FiPackage, FiTruck, FiGlobe, FiShield, FiBox, FiHeadphones } from 'react-icons/fi';

export const metadata: Metadata = {
    title: "Our Services — Sourcing, Shipping & Customs Clearance",
    description: "End-to-end global trading services: product sourcing from China, shipping & logistics, freight forwarding, customs clearance, and warehousing — all the way to your door in Bangladesh.",
    alternates: { canonical: "/services" },
};

const services = [
    {
        id: 'sourcing',
        icon: <FiPackage size={28} />,
        title: 'Product Sourcing',
        desc: 'We source high-quality products directly from verified manufacturers in China, ensuring the best prices and authentic items for your business.',
        color: 'var(--color-primary)',
    },
    {
        id: 'shipping',
        icon: <FiTruck size={28} />,
        title: 'Shipping & Logistics',
        desc: 'End-to-end shipping solutions from China to Bangladesh via air, sea, and express delivery with real-time tracking.',
        color: '#1565C0',
    },
    {
        id: 'freight',
        icon: <FiGlobe size={28} />,
        title: 'Freight Forwarding',
        desc: 'Professional freight forwarding services handling all documentation, customs, and transit logistics for smooth delivery.',
        color: '#E65100',
    },
    {
        id: 'customs',
        icon: <FiShield size={28} />,
        title: 'Customs Clearance',
        desc: 'Complete customs clearance support ensuring your goods pass through smoothly with all required documentation and compliance.',
        color: '#7B1FA2',
    },
    {
        id: 'warehousing',
        icon: <FiBox size={28} />,
        title: 'Warehousing',
        desc: 'Secure warehousing facilities in China and Bangladesh for storage, consolidation, and quality inspection before shipping.',
        color: '#00838F',
    },
    {
        id: 'support',
        icon: <FiHeadphones size={28} />,
        title: '24/7 Support',
        desc: 'Dedicated customer support team available around the clock to assist with orders, tracking, and any queries.',
        color: '#AD1457',
    },
];

export default function ServicesPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-br from-[var(--color-primary)] to-[#4338CA] text-white py-16 sm:py-20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">Our Services</h1>
                    <p className="text-white/70 max-w-xl mx-auto text-sm sm:text-base">
                        From sourcing to delivery — we handle every step of your global trading journey with expertise and care.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-white/40">
                        <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
                        <span>/</span>
                        <span className="text-white/80">Services</span>
                    </div>
                </div>
            </div>

            {/* Services Grid */}
            <div className="container mx-auto px-4 -mt-8 pb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {services.map((s, i) => (
                        <div
                            key={i}
                            id={s.id}
                            className="bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group scroll-mt-28"
                        >
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform"
                                style={{ background: `${s.color}12`, color: s.color }}
                            >
                                {s.icon}
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-12 bg-white rounded-xl border border-gray-100 p-8 sm:p-10 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Need a Custom Solution?</h2>
                    <p className="text-sm text-gray-500 mb-6 max-w-lg mx-auto">
                        Contact our team for personalized sourcing, bulk orders, or any special requirements. We're here to help your business grow.
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 bg-[var(--color-primary)] text-white px-8 py-3 rounded-lg font-semibold text-sm hover:bg-[#093a1d] transition-colors"
                    >
                        Contact Us →
                    </Link>
                </div>
            </div>
        </div>
    );
}

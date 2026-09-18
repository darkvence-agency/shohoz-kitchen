"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    FiPackage, FiMapPin, FiCheckCircle, FiTruck, FiHome,
    FiPlay, FiArrowRight, FiGlobe, FiHeadphones,
    FiBarChart2, FiShield, FiDollarSign,
} from 'react-icons/fi';

/* ── How it works steps ── */
const steps = [
    {
        number: 1,
        icon: <FiPackage size={28} />,
        title: 'Create your shipment request',
        desc: 'Fill in basic shipment information to begin your request.',
        color: 'bg-blue-50 border-blue-200 text-blue-600',
        active: true,
    },
    {
        number: 2,
        icon: <FiDollarSign size={28} />,
        title: 'Check your Shipping cost, warehouse address. Start Shipping & add tracking no.',
        desc: 'Review costs and start shipping.',
        color: 'bg-gray-50 border-gray-200 text-gray-500',
        active: false,
    },
    {
        number: 3,
        icon: <FiMapPin size={28} />,
        title: 'Product receive in Source Warehouse and ship to Destination Warehouse',
        desc: 'We receive and forward your package.',
        color: 'bg-gray-50 border-gray-200 text-gray-500',
        active: false,
    },
    {
        number: 4,
        icon: <FiCheckCircle size={28} />,
        title: 'Product received in Destination Warehouse and create delivery request',
        desc: 'Package arrives at destination warehouse.',
        color: 'bg-gray-50 border-gray-200 text-gray-500',
        active: false,
    },
    {
        number: 5,
        icon: <FiHome size={28} />,
        title: 'Deliver successfully to your doorstep',
        desc: 'Final delivery to your address.',
        color: 'bg-gray-50 border-gray-200 text-gray-500',
        active: false,
    },
];

/* ── Step detail slides ── */
const stepDetails = [
    {
        title: 'Create your shipment request',
        subtitle: 'Step 1-3, Add to Shipping List and Submit Request',
        bullets: [
            { label: 'Shipment Details', text: 'Start by filling in basic shipment information to begin your request.' },
            { label: 'Product Details', text: 'Add details about the items you\'re shipping to ensure accurate processing.' },
            { label: 'Value-Added Services & Delivery Address', text: 'Choose optional services and provide your delivery address.' },
        ],
        note: "After completing these steps, you'll be able to review all the information and add it to your shipping list.",
        note2: "On the Shipping List page, select the items you want to ship and submit your request to us!",
    },
    {
        title: 'Check Shipping Cost & Add Tracking',
        subtitle: 'Step 2 — Review & Start Shipping',
        bullets: [
            { label: 'Shipping Cost', text: 'Get an instant estimate for shipping your products from source to destination.' },
            { label: 'Warehouse Address', text: 'Receive the source warehouse address to send your products to.' },
            { label: 'Tracking Number', text: 'Add the tracking number once you\'ve shipped to the source warehouse.' },
        ],
        note: "We support multiple shipping types — By Air and By Ship — to suit your timeline and budget.",
        note2: "Choose Cargo, International, or P2P shipping type based on your needs.",
    },
    {
        title: 'Product Received at Source Warehouse',
        subtitle: 'Step 3 — We Handle the Rest',
        bullets: [
            { label: 'Quality Check', text: 'Our team verifies your product upon arrival at the source warehouse.' },
            { label: 'Repacking', text: 'Products are professionally repacked for safe international transit.' },
            { label: 'Forwarding', text: 'Package is forwarded to the destination warehouse on your behalf.' },
        ],
        note: "Your products are in safe hands throughout the entire journey from source to destination.",
        note2: "You will receive real-time updates at every stage of the process.",
    },
    {
        title: 'Product at Destination Warehouse',
        subtitle: 'Step 4 — Create Delivery Request',
        bullets: [
            { label: 'Arrival Notification', text: 'You will be notified when your product arrives at the destination warehouse.' },
            { label: 'Delivery Request', text: 'Create a delivery request specifying your final delivery address.' },
            { label: 'Schedule', text: 'Choose a preferred delivery date and time window that suits you.' },
        ],
        note: "Manage all your incoming shipments from one easy-to-use dashboard.",
        note2: "Flexible delivery options to ensure you receive your package conveniently.",
    },
    {
        title: 'Delivered to Your Doorstep',
        subtitle: 'Step 5 — Final Delivery',
        bullets: [
            { label: 'Last Mile Delivery', text: 'Your package is handed over to our trusted local delivery partners.' },
            { label: 'Real-Time Tracking', text: 'Track your delivery in real-time right up to your doorstep.' },
            { label: 'Confirmation', text: 'Receive confirmation once the package is successfully delivered.' },
        ],
        note: "Our end-to-end service ensures your products arrive safely and on time.",
        note2: "Rate your experience and help us improve our service for you.",
    },
];

/* ── Why choose features ── */
const features = [
    { icon: <FiShield size={28} />, title: 'Seamless Integration', desc: 'Effortlessly manage your shipments with our user-friendly platform.' },
    { icon: <FiBarChart2 size={28} />, title: 'Real-Time Tracking', desc: 'Monitor your shipment status from dispatch to delivery.' },
    { icon: <FiDollarSign size={28} />, title: 'Cost-Effective Solutions', desc: 'Enjoy competitive shipping rates and save on logistics costs.' },
    { icon: <FiGlobe size={28} />, title: 'Global Reach', desc: 'Connect with suppliers and ship products from multiple countries.' },
    { icon: <FiHeadphones size={28} />, title: 'Customer Support', desc: 'Get dedicated support to handle your queries & ensure smooth operations.' },
];

const ShipForMePage: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);

    return (
        <div className="min-h-screen bg-white">

            {/* ── Hero ── */}
            <section className="w-full bg-gradient-to-br from-[var(--color-primary-lightest)] to-white py-14 px-4">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
                    {/* Text */}
                    <div className="flex-1">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
                            Simplify Your Shipping with{' '}
                            <span className="text-[var(--color-primary)]">Sinortiglobal</span>
                        </h1>
                        <p className="text-gray-500 text-base leading-relaxed mb-8 max-w-lg">
                            Sinortiglobal offers a seamless solution for shipping your products from different countries
                            directly to your doorstep. Our Ship for Me service ensures a hassle-free experience by
                            handling all logistics, letting you focus on your business.
                        </p>
                        <div className="flex flex-wrap items-center gap-4">
                            <Link
                                href="/contact"
                                className="flex items-center gap-2 px-7 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-full hover:bg-[var(--color-primary-dark)] transition-colors shadow-md"
                            >
                                Let&apos;s Ship Now <FiArrowRight />
                            </Link>
                            <button className="flex items-center gap-2 px-5 py-3 text-gray-700 font-medium hover:text-[var(--color-primary)] transition-colors">
                                <span className="w-9 h-9 flex items-center justify-center rounded-full bg-red-100 text-red-500">
                                    <FiPlay size={14} fill="currentColor" />
                                </span>
                                See how Ship for me works
                            </button>
                        </div>
                    </div>

                    {/* Illustration */}
                    <div className="flex-1 flex justify-center">
                        <div className="relative w-full max-w-md h-64 flex items-center justify-center">
                            {/* Airplane */}
                            <div className="absolute top-0 right-8 text-8xl select-none" style={{ transform: 'rotate(-10deg)' }}>✈️</div>
                            {/* Truck */}
                            <div className="absolute bottom-4 left-4 text-7xl select-none">🚚</div>
                            {/* Globe */}
                            <div className="absolute bottom-2 right-12 text-6xl select-none">🌍</div>
                            {/* Boxes */}
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-5xl select-none">📦</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How it Works ── */}
            <section className="w-full py-14 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">How Ship for me Works</h2>

                    {/* Steps row */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-10">
                        {steps.map((step, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveStep(idx)}
                                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 text-center transition-all duration-200 cursor-pointer
                                    ${activeStep === idx
                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)] shadow-md'
                                        : 'border-gray-100 bg-gray-50 hover:border-[var(--color-primary-border)]'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                                    ${activeStep === idx ? 'bg-[var(--color-primary)] text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                                    {step.number}
                                </div>
                                <p className={`text-[12px] font-medium leading-tight ${activeStep === idx ? 'text-[var(--color-primary)]' : 'text-gray-500'}`}>
                                    {step.title}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Step detail card */}
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 flex flex-col md:flex-row gap-8 transition-all duration-300">
                        {/* Left text */}
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-1">{stepDetails[activeStep].title}</h3>
                            <p className="text-sm font-semibold text-[var(--color-primary)] mb-5">{stepDetails[activeStep].subtitle}</p>
                            <ul className="space-y-3 mb-5">
                                {stepDetails[activeStep].bullets.map((b, i) => (
                                    <li key={i} className="flex gap-2 text-sm text-gray-600">
                                        <span className="mt-0.5 text-[var(--color-primary)] flex-shrink-0"><FiCheckCircle size={16} /></span>
                                        <span><strong>{b.label}:</strong> {b.text}</span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-sm text-gray-500 italic mb-2">{stepDetails[activeStep].note}</p>
                            <p className="text-sm text-gray-500 italic">{stepDetails[activeStep].note2}</p>
                        </div>

                        {/* Right mockup */}
                        <div className="flex-1 bg-gradient-to-br from-gray-50 to-[var(--color-primary-lightest)] rounded-xl p-6 flex flex-col gap-3 min-h-[220px]">
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                Ship for me: Step {activeStep + 1}
                            </div>
                            <div className="flex items-center gap-3 bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)]">
                                    {steps[activeStep].icon}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-800">{steps[activeStep].title}</p>
                                </div>
                            </div>
                            {/* Fake progress bar */}
                            <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
                                <div
                                    className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${((activeStep + 1) / 5) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Step {activeStep + 1} of 5</p>

                            {/* Nav dots */}
                            <div className="flex gap-2 mt-auto pt-2">
                                {steps.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setActiveStep(i)}
                                        className={`w-2.5 h-2.5 rounded-full transition-colors ${i === activeStep ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Why Choose ── */}
            <section className="w-full py-14 px-4 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-10">
                        Why Choose Sinortiglobal Shipment Services?
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                        {features.map((f, i) => (
                            <div key={i} className="flex flex-col items-center text-center gap-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-16 h-16 rounded-full bg-[var(--color-primary-lightest)] flex items-center justify-center text-[var(--color-primary)]">
                                    {f.icon}
                                </div>
                                <h4 className="text-sm font-bold text-gray-800">{f.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Cost Calculator promo ── */}
            <section className="w-full py-14 px-4 bg-white">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10">
                    <div className="flex-1">
                        <p className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-widest mb-2">Shipping</p>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Cost Calculator</h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-md">
                            Use our shipping cost calculator to quickly estimate the cost of sending your products.
                            Enter the details to get an instant quote and plan your shipments efficiently.
                        </p>
                        <Link
                            href="/cost-calculator"
                            className="inline-flex items-center gap-2 px-7 py-3 bg-[var(--color-primary)] text-white font-semibold rounded-full hover:bg-[var(--color-primary-dark)] transition-colors shadow-md"
                        >
                            Calculate Now <FiArrowRight />
                        </Link>
                    </div>
                    <div className="flex-1 flex justify-center">
                        <div className="text-[120px] select-none">🧮</div>
                    </div>
                </div>
            </section>

            {/* ── Ready to Start CTA ── */}
            <section className="w-full py-16 px-4 bg-[var(--color-primary)]">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-extrabold text-white mb-3">Ready to Start?</h2>
                    <p className="text-blue-100 text-sm mb-8">
                        Experience the convenience of Sinortiglobal Ship for Me service.
                        Click below to get started with your shipping request!
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[var(--color-primary)] font-bold rounded-full hover:bg-blue-50 transition-colors shadow-lg"
                    >
                        Get Started Now <FiArrowRight />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default ShipForMePage;

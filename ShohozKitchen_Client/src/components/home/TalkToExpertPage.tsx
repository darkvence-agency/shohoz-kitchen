"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    FiShield, FiDollarSign, FiPackage,
    FiLock, FiCompass, FiBarChart2,
    FiStar, FiChevronLeft, FiChevronRight, FiArrowRight,
} from 'react-icons/fi';

const REASONS = [
    'Product Sourcing',
    'Shipping Inquiry',
    'Cost Estimation',
    'Business Partnership',
    'Technical Support',
    'Other',
];

const features = [
    {
        icon: <FiCompass size={24} />,
        title: 'Simplified Logistics Management',
        desc: 'Streamline logistics processes to ensure efficient, hassle-free cross-border shipping, allowing your business to expand seamlessly and effectively.',
    },
    {
        icon: <FiDollarSign size={24} />,
        title: 'Competitive Shipping Rates',
        desc: 'Offer competitive and attractive shipping rates to appeal to a broader audience, enhancing your market reach and expanding global presence.',
    },
    {
        icon: <FiPackage size={24} />,
        title: 'Secure Packaging Solutions',
        desc: 'Employ professional packaging methods to ensure your items are protected and secure during transit, guaranteeing safe delivery every time.',
    },
    {
        icon: <FiLock size={24} />,
        title: 'Secure Payment Handling',
        desc: 'We ensure safe and secure payment processes, offering peace of mind and reliability for worry-free transactions with our services.',
    },
    {
        icon: <FiShield size={24} />,
        title: 'Expert Shipping Advice',
        desc: 'Receive expert guidance to select the most suitable shipping options tailored specifically to meet your unique needs and preferences effectively.',
    },
    {
        icon: <FiBarChart2 size={24} />,
        title: 'Instant Cost Estimates',
        desc: 'Get immediate shipping cost estimates to enhance your planning capabilities and make informed decisions regarding your shipping logistics and operations.',
    },
];

const testimonials = [
    {
        rating: 4,
        quote: "Stunning Sinortiglobal's customer support team, they help me to select winning products and grow my business.",
        name: 'Sheikh Sakibul Hasan',
        title: 'Founder and CEO',
        avatar: '👨‍💼',
    },
    {
        rating: 5,
        quote: "The expert team guided me through every step of the sourcing process. Highly recommended!",
        name: 'Maria Chen',
        title: 'E-commerce Entrepreneur',
        avatar: '👩‍💼',
    },
    {
        rating: 5,
        quote: "Fast response, knowledgeable staff, and excellent shipping solutions. A game changer for my business.",
        name: 'James Williams',
        title: 'Import Business Owner',
        avatar: '👨‍💻',
    },
];

const TalkToExpertPage: React.FC = () => {
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', reason: '', message: '', agree: false,
    });
    const [tIdx, setTIdx] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    const set = (key: string, value: string | boolean) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
    };

    const prev = () => setTIdx(i => (i - 1 + testimonials.length) % testimonials.length);
    const next = () => setTIdx(i => (i + 1) % testimonials.length);

    return (
        <div className="min-h-screen bg-white">

            {/* ── Hero / Contact Form ── */}
            <section className="w-full py-12 px-4 bg-white">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 items-stretch">

                    {/* Left: Image */}
                    <div className="flex-1 rounded-2xl overflow-hidden min-h-[420px] bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center relative">
                        {/* Placeholder with overlapping avatars */}
                        <div className="absolute inset-0 flex items-end justify-center pb-8 gap-3">
                            <div className="w-24 h-32 bg-gray-600 rounded-xl flex items-end justify-center pb-3 text-4xl">🧑‍💼</div>
                            <div className="w-28 h-40 bg-gray-500 rounded-xl flex items-end justify-center pb-3 text-4xl">👩‍💼</div>
                            <div className="w-24 h-32 bg-gray-600 rounded-xl flex items-end justify-center pb-3 text-4xl">👨‍💻</div>
                        </div>
                        <div className="absolute inset-0 bg-black/20" />
                    </div>

                    {/* Right: Form */}
                    <div className="flex-1 bg-white">
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">Connect with expert support</h2>
                        <p className="text-sm text-gray-400 mb-7">We look forward to hearing from you.</p>

                        {submitted ? (
                            <div className="py-16 text-center">
                                <div className="text-5xl mb-4">✅</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Message Sent!</h3>
                                <p className="text-gray-500 text-sm">Our expert team will contact you shortly.</p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="mt-6 px-6 py-2.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-full text-sm font-semibold hover:bg-[var(--color-primary-lightest)] transition-colors"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Your full name"
                                        value={form.fullName}
                                        onChange={e => set('fullName', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="your@email.com"
                                        value={form.email}
                                        onChange={e => set('email', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm text-gray-600 flex-shrink-0">
                                            🇧🇩 +880
                                        </div>
                                        <input
                                            required
                                            type="tel"
                                            placeholder="Enter a phone number"
                                            value={form.phone}
                                            onChange={e => set('phone', e.target.value)}
                                            className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        required
                                        value={form.reason}
                                        onChange={e => set('reason', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                                    >
                                        <option value="">Select a reason</option>
                                        {REASONS.map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Message <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Leave us a message..."
                                        value={form.message}
                                        onChange={e => set('message', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.agree}
                                        onChange={e => set('agree', e.target.checked)}
                                        className="rounded"
                                        required
                                    />
                                    You agree to our friendly{' '}
                                    <Link href="/privacy" className="text-[var(--color-primary)] underline">Privacy policy</Link>.
                                </label>
                                <button
                                    type="submit"
                                    className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm"
                                >
                                    Send Message
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            {/* ── How experts boost your business ── */}
            <section className="w-full py-14 px-4 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                        How our experts can boost your business to its full potential
                    </h2>
                    <p className="text-sm text-gray-400 text-center mb-10">
                        Our experts leverage strategic insights and innovative solutions to maximize your business&apos;s growth and profitability.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {features.map((f, i) => (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-lightest)] flex items-center justify-center text-[var(--color-primary)] mb-4">
                                    {f.icon}
                                </div>
                                <h4 className="text-sm font-bold text-gray-800 mb-2">{f.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ── */}
            <section className="w-full py-14 px-4 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
                        How our experts can boost your business to its full potential
                    </h2>
                    <p className="text-sm text-gray-400 text-center mb-10">
                        Our experts leverage strategic insights and innovative solutions to maximize your business&apos;s growth and profitability.
                    </p>
                    <div className="flex flex-col md:flex-row gap-10 items-center">
                        {/* Testimonial text */}
                        <div className="flex-1">
                            {/* Stars */}
                            <div className="flex gap-1 mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <FiStar key={i} size={20}
                                        className={i < testimonials[tIdx].rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
                                        fill={i < testimonials[tIdx].rating ? 'currentColor' : 'none'}
                                    />
                                ))}
                            </div>
                            <p className="text-xl font-semibold text-gray-800 leading-snug mb-6">
                                &ldquo;{testimonials[tIdx].quote}&rdquo;
                            </p>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                                    {testimonials[tIdx].avatar}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-800">{testimonials[tIdx].name}</p>
                                    <p className="text-xs text-gray-400">{testimonials[tIdx].title}</p>
                                </div>
                            </div>
                            {/* Nav arrows */}
                            <div className="flex gap-2">
                                <button onClick={prev} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
                                    <FiChevronLeft size={18} />
                                </button>
                                <button onClick={next} className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
                                    <FiChevronRight size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Photo collage */}
                        <div className="flex-1 grid grid-cols-3 gap-2 max-w-sm">
                            {['👨‍💼', '👩‍💼', '🧑‍💻', '👩‍💻', '👨‍🔬', '👩‍🎓'].map((em, i) => (
                                <div
                                    key={i}
                                    className={`bg-gray-100 rounded-xl flex items-center justify-center text-4xl
                                        ${i === 0 ? 'col-span-1 row-span-2 h-36' : 'h-16'}`}
                                >
                                    {em}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="w-full py-14 px-4 bg-gray-50">
                <div className="max-w-xl mx-auto text-center">
                    <div className="text-3xl mb-3">👥</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Look interesting right?</h2>
                    <p className="text-sm text-gray-400 mb-6">
                        Connect with expert support and Maximum your business growth now.
                    </p>
                    <Link
                        href="#"
                        onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="inline-flex items-center gap-2 text-[var(--color-primary)] font-semibold hover:underline text-sm"
                    >
                        Talk to The Expert <FiArrowRight size={16} />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default TalkToExpertPage;

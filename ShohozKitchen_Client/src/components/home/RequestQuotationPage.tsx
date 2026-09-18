"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiCheckCircle, FiXCircle, FiUpload } from 'react-icons/fi';

const COUNTRIES = [
    'China', 'USA', 'India', 'Germany', 'Japan', 'South Korea',
    'Italy', 'France', 'UK', 'Bangladesh', 'Vietnam', 'Thailand',
];

const CATEGORIES = [
    'Electronics', 'Fashion & Clothing', 'Home & Garden', 'Beauty & Health',
    'Sports & Outdoors', 'Toys & Games', 'Automotive', 'Food & Beverages',
    'Industrial & Scientific', 'Books & Stationery',
];

const SHIPPING_MODES = ['Cargo', 'Express', 'Standard', 'Economy'];
const SHIPPING_TYPES = ['By Air', 'By Ship', 'By Road'];
const WAREHOUSES = [
    'Australia Melbourne Warehouse',
    'USA Los Angeles Warehouse',
    'UK London Warehouse',
    'China Guangzhou Warehouse',
];
const UNITS = ['KG', 'Piece', 'Box', 'Carton', 'Set', 'Pair'];

interface FormState {
    productName: string;
    productCategory: string;
    sourcingCountry: string;
    productLink: string;
    quantity: string;
    unit: string;
    aboutProduct: string;
    photos: File[];
    shippingMode: string;
    shippingType: string;
    warehouse: string;
}

const completenessFields: { key: keyof FormState; label: string; alwaysGreen?: boolean }[] = [
    { key: 'productName', label: 'Product Name' },
    { key: 'productCategory', label: 'Product Category' },
    { key: 'sourcingCountry', label: 'Sourcing Country' },
    { key: 'productLink', label: 'Product Link' },
    { key: 'quantity', label: 'Purchase Quantity' },
    { key: 'unit', label: 'Purchase Unit Type' },
    { key: 'aboutProduct', label: 'About your products' },
    { key: 'shippingMode', label: 'Shipping Mode' },
    { key: 'shippingType', label: 'Shipping Type' },
    { key: 'warehouse', label: 'Destination point' },
];

const isFieldFilled = (val: FormState[keyof FormState]): boolean => {
    if (Array.isArray(val)) return val.length > 0;
    return String(val).trim().length > 0;
};

const RequestQuotationPage: React.FC = () => {
    const [form, setForm] = useState<FormState>({
        productName: '',
        productCategory: '',
        sourcingCountry: '',
        productLink: '',
        quantity: '',
        unit: 'KG',
        aboutProduct: '',
        photos: [],
        shippingMode: 'Cargo',
        shippingType: 'By Air',
        warehouse: 'Australia Melbourne Warehouse',
    });
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const set = (key: keyof FormState, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const arr = Array.from(files).slice(0, 3);
        setForm(prev => ({ ...prev, photos: arr }));
    };

    const filledCount = completenessFields.filter(f => isFieldFilled(form[f.key])).length;
    const pct = Math.round((filledCount / completenessFields.length) * 100);
    const completenessLabel = pct < 40 ? 'POOR' : pct < 70 ? 'FAIR' : pct < 90 ? 'GOOD' : 'GREAT';
    const completenessColor = pct < 40 ? '#EF4444' : pct < 70 ? '#F59E0B' : pct < 90 ? '#3B82F6' : '#22C55E';

    // SVG donut params
    const r = 54, cx = 70, cy = 70, strokeW = 10;
    const circumference = 2 * Math.PI * r;
    const dash = (pct / 100) * circumference;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Back + steps header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="max-w-6xl mx-auto">
                    <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--color-primary)] mb-4 transition-colors">
                        <FiArrowLeft size={16} /> Back
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 mb-4">Request for Quotation (RFQ)</h1>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                        {[
                            'Submit a RFQ in just a minute.',
                            'Get quotations from verified suppliers.',
                            'Choose the best quotation!',
                        ].map((s, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                                    ${i === 0 ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}>
                                    {i + 1}
                                </span>
                                <span className={i === 0 ? 'text-gray-800 font-medium' : 'text-gray-400'}>{s}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-6">

                    {/* ── Left: Form ── */}
                    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-7">

                        {/* Product name */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Product name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Enter a specific product name, e.g. 'MP3 Players instead of 'Electronics.'"
                                value={form.productName}
                                onChange={e => set('productName', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                            />
                        </div>

                        {/* Product Category */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Product Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.productCategory}
                                onChange={e => set('productCategory', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                            >
                                <option value="">Select your product category</option>
                                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Sourcing Country */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Sourcing Country <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.sourcingCountry}
                                onChange={e => set('sourcingCountry', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                            >
                                <option value="">Select Country</option>
                                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* Product Link */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Product Link</label>
                            <input
                                type="url"
                                placeholder="Paste product link here"
                                value={form.productLink}
                                onChange={e => set('productLink', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                            />
                        </div>

                        {/* Purchase quantity */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Purchase quantity <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder="Quantity"
                                    min={1}
                                    value={form.quantity}
                                    onChange={e => set('quantity', e.target.value)}
                                    className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                                />
                                <select
                                    value={form.unit}
                                    onChange={e => set('unit', e.target.value)}
                                    className="w-36 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                                >
                                    {UNITS.map(u => <option key={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* About your products */}
                        <div className="mb-5">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                About your products <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={4}
                                placeholder="Please indicate your detailed requirements to ensure fast and efficient responses from suppliers. You may include: Material, Size/Dimension, Grade/Quality Standard, Packaging requirements and/or others."
                                value={form.aboutProduct}
                                onChange={e => set('aboutProduct', e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
                            />
                        </div>

                        {/* Upload Photos */}
                        <div className="mb-8">
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Upload Photos <span className="text-red-500">*</span>
                            </label>
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                                onClick={() => fileRef.current?.click()}
                                className={`w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center cursor-pointer transition-colors
                                    ${dragOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)]' : 'border-gray-200 bg-gray-50 hover:border-[var(--color-primary-border)]'}`}
                            >
                                <FiUpload size={28} className="text-green-500 mb-2" />
                                <p className="text-sm text-gray-500">
                                    Drag &amp; drop image here or{' '}
                                    <span className="text-[var(--color-primary)] font-medium underline">Choose files</span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">All image formats, PDF, XLSX, CSV. Max 3 files, 20 MB each.</p>
                                {form.photos.length > 0 && (
                                    <p className="text-xs text-green-600 font-medium mt-2">{form.photos.length} file(s) selected</p>
                                )}
                            </div>
                            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.xlsx,.csv" className="hidden" onChange={e => handleFiles(e.target.files)} />
                        </div>

                        {/* Shipping Details */}
                        <div className="border-t border-gray-100 pt-7">
                            <h2 className="text-lg font-bold text-gray-800 mb-5">Shipping Details</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Shipping Mode <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.shippingMode}
                                        onChange={e => set('shippingMode', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                                    >
                                        {SHIPPING_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Shipping type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={form.shippingType}
                                        onChange={e => set('shippingType', e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                                    >
                                        {SHIPPING_TYPES.map(t => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mb-7">
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Select warehouse <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={form.warehouse}
                                    onChange={e => set('warehouse', e.target.value)}
                                    className="w-full md:w-1/2 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors appearance-none bg-white"
                                >
                                    {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                                </select>
                            </div>

                            <button
                                type="button"
                                className="px-8 py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm"
                            >
                                Request Quotes
                            </button>
                        </div>
                    </div>

                    {/* ── Right: Completeness ── */}
                    <div className="w-full lg:w-72 flex-shrink-0">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
                            <h3 className="text-lg font-bold text-gray-800 text-center mb-5">Completeness</h3>

                            {/* Donut */}
                            <div className="flex justify-center mb-4">
                                <svg width="140" height="140" viewBox="0 0 140 140">
                                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={strokeW} />
                                    <circle
                                        cx={cx} cy={cy} r={r}
                                        fill="none"
                                        stroke={completenessColor}
                                        strokeWidth={strokeW}
                                        strokeDasharray={`${dash} ${circumference - dash}`}
                                        strokeDashoffset={circumference / 4}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dasharray 0.4s ease' }}
                                    />
                                    <text x={cx} y={cy + 6} textAnchor="middle" fontSize="18" fontWeight="bold" fill={completenessColor}>
                                        {completenessLabel}
                                    </text>
                                </svg>
                            </div>

                            {/* Field checklist */}
                            <ul className="space-y-2.5">
                                {completenessFields.map(f => {
                                    const filled = isFieldFilled(form[f.key]);
                                    return (
                                        <li key={f.key} className="flex items-center gap-2.5 text-sm">
                                            {filled
                                                ? <FiCheckCircle className="text-green-500 flex-shrink-0" size={17} />
                                                : <FiXCircle className="text-red-400 flex-shrink-0" size={17} />
                                            }
                                            <span className={filled ? 'text-gray-700' : 'text-gray-400'}>{f.label}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RequestQuotationPage;

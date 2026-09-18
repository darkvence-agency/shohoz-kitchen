"use client";

import React, { useState } from 'react';
import { FiUser, FiHome, FiMapPin, FiArrowRight, FiPackage, FiInfo } from 'react-icons/fi';

/* ── Shipping rate table (USD per kg) ── */
const RATE_TABLE: Record<string, { air: number; sea: number }> = {
    China:       { air: 4.5,  sea: 1.2 },
    USA:         { air: 6.0,  sea: 2.0 },
    India:       { air: 3.8,  sea: 1.0 },
    Germany:     { air: 6.5,  sea: 2.2 },
    Japan:       { air: 5.5,  sea: 1.8 },
    'South Korea': { air: 5.0, sea: 1.6 },
    Italy:       { air: 6.2,  sea: 2.1 },
    France:      { air: 6.3,  sea: 2.1 },
    UK:          { air: 6.4,  sea: 2.1 },
    Vietnam:     { air: 3.5,  sea: 1.0 },
    Thailand:    { air: 3.6,  sea: 1.0 },
    Bangladesh:  { air: 3.2,  sea: 0.9 },
};

const COUNTRIES = Object.keys(RATE_TABLE);

const CATEGORIES = [
    'Electronics', 'Fashion & Clothing', 'Home & Garden', 'Beauty & Health',
    'Sports & Outdoors', 'Toys & Games', 'Automotive', 'Food & Beverages',
    'Industrial & Scientific', 'Books & Stationery',
];

/* surcharge per category (multiplier on base rate) */
const CAT_SURCHARGE: Record<string, number> = {
    Electronics: 1.15,
    Automotive: 1.2,
    'Food & Beverages': 1.1,
    'Beauty & Health': 1.05,
    Default: 1.0,
};

const CONTAINS = ['Regular', 'Fragile', 'Liquid', 'Perishable', 'Hazardous'];
const CONTAINS_SURCHARGE: Record<string, number> = {
    Regular: 1.0, Fragile: 1.15, Liquid: 1.2, Perishable: 1.25, Hazardous: 1.5,
};

interface Result {
    actualWeight: number;
    volumetricWeight: number;
    billableWeight: number;
    airCost: number;
    seaCost: number;
    currency: string;
}

const CostCalculatorPage: React.FC = () => {
    const [orderType, setOrderType] = useState<'buy-ship' | 'ship-only'>('buy-ship');
    const [fromCountry, setFromCountry] = useState('China');
    const [toZip, setToZip] = useState('');
    const [category, setCategory] = useState('');
    const [contains, setContains] = useState('Regular');
    const [weight, setWeight] = useState('');
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState('');

    const calculate = () => {
        setError('');
        setResult(null);

        const w = parseFloat(weight);
        if (!w || w <= 0) { setError('Please enter a valid weight.'); return; }
        if (!category) { setError('Please select a product category.'); return; }
        if (!toZip.trim()) { setError('Please enter destination postal code.'); return; }

        const l = parseFloat(length) || 0;
        const wi = parseFloat(width) || 0;
        const h = parseFloat(height) || 0;

        /* Volumetric weight: L×W×H / 5000 for air, /6000 for sea (cm→kg) */
        const volWeightAir = l && wi && h ? (l * wi * h) / 5000 : 0;
        const volWeightSea = l && wi && h ? (l * wi * h) / 6000 : 0;
        const billableAir = Math.max(w, volWeightAir);
        const billableSea = Math.max(w, volWeightSea);

        const base = RATE_TABLE[fromCountry] ?? { air: 5.0, sea: 1.5 };
        const catMul = CAT_SURCHARGE[category] ?? CAT_SURCHARGE.Default;
        const conMul = CONTAINS_SURCHARGE[contains] ?? 1.0;

        const airCost = billableAir * base.air * catMul * conMul;
        const seaCost = billableSea * base.sea * catMul * conMul;

        setResult({
            actualWeight: w,
            volumetricWeight: Math.max(volWeightAir, volWeightSea),
            billableWeight: Math.max(billableAir, billableSea),
            airCost: Math.round(airCost * 100) / 100,
            seaCost: Math.round(seaCost * 100) / 100,
            currency: 'USD',
        });
    };

    return (
        <div className="min-h-screen bg-gray-100 py-10 px-4">
            <div className="max-w-4xl mx-auto">

                {/* ── Main Card ── */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">

                    {/* Form section */}
                    <div className="p-8">
                        <h1 className="text-xl font-bold text-gray-800 mb-6">Shipping Cost Calculator</h1>

                        {/* Order Type */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Order Type <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-6">
                                {[
                                    { val: 'buy-ship', label: 'Buy And Ship For Me' },
                                    { val: 'ship-only', label: 'Only Ship For Me' },
                                ].map(opt => (
                                    <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors
                                            ${orderType === opt.val ? 'border-[var(--color-primary)] bg-[var(--color-primary)]' : 'border-gray-300'}`}>
                                            {orderType === opt.val && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                                        </span>
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* From / To */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    From <span className="text-red-500">*</span>{' '}
                                    <span className="font-normal text-gray-400">(Source Country)</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={fromCountry}
                                        onChange={e => setFromCountry(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] appearance-none bg-white pl-10"
                                    >
                                        {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">🌐</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    To <span className="text-red-500">*</span>{' '}
                                    <span className="font-normal text-gray-400">(Destination Postal / Zip Code)</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 text-sm text-gray-600 flex-shrink-0">
                                        🇧🇩
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Postal / Zip Code"
                                        value={toZip}
                                        onChange={e => setToZip(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Category / Contains */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Product Category <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] appearance-none bg-white"
                                >
                                    <option value="">Select your product category</option>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Contains</label>
                                <select
                                    value={contains}
                                    onChange={e => setContains(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] appearance-none bg-white"
                                >
                                    {CONTAINS.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Weight / CBM */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    Weight <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={0}
                                        placeholder="0"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-12 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">Kg</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">
                                    CBM{' '}
                                    <span className="font-normal text-gray-400">(optional — for volumetric weight)</span>
                                </label>
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="number" min={0} placeholder="Length"
                                        value={length} onChange={e => setLength(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                    <input
                                        type="number" min={0} placeholder="Width"
                                        value={width} onChange={e => setWidth(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                    <input
                                        type="number" min={0} placeholder="Height"
                                        value={height} onChange={e => setHeight(e.target.value)}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[var(--color-primary)] transition-colors"
                                    />
                                    <span className="text-xs font-semibold text-gray-400 flex-shrink-0">Cm</span>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-sm text-red-500 mb-4 flex items-center gap-1.5">
                                <FiInfo size={14} /> {error}
                            </p>
                        )}

                        <button
                            onClick={calculate}
                            className="px-7 py-3 bg-[var(--color-primary)] text-white font-bold rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm text-sm"
                        >
                            Get Shipping Rate
                        </button>
                    </div>

                    {/* ── Result ── */}
                    {result && (
                        <div className="border-t border-gray-100 bg-[var(--color-primary-lightest)] px-8 py-6">
                            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <FiPackage className="text-[var(--color-primary)]" />
                                Estimated Shipping Cost
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                {[
                                    { label: 'Actual Weight', value: `${result.actualWeight} Kg` },
                                    { label: 'Volumetric Weight', value: result.volumetricWeight > 0 ? `${result.volumetricWeight.toFixed(2)} Kg` : 'N/A' },
                                    { label: 'Billable Weight', value: `${result.billableWeight.toFixed(2)} Kg` },
                                    { label: 'From', value: fromCountry },
                                ].map(item => (
                                    <div key={item.label} className="bg-white rounded-xl p-4 border border-[var(--color-primary-border)]">
                                        <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                                        <p className="text-sm font-bold text-gray-800">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl p-5 border-2 border-[var(--color-primary)] shadow-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-semibold text-gray-600">✈️ By Air</p>
                                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">Faster</span>
                                    </div>
                                    <p className="text-2xl font-extrabold text-[var(--color-primary)]">
                                        ${result.airCost.toFixed(2)} <span className="text-sm font-normal text-gray-400">USD</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Est. 7–14 business days</p>
                                </div>
                                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm font-semibold text-gray-600">🚢 By Sea</p>
                                        <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">Economical</span>
                                    </div>
                                    <p className="text-2xl font-extrabold text-gray-800">
                                        ${result.seaCost.toFixed(2)} <span className="text-sm font-normal text-gray-400">USD</span>
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">Est. 25–40 business days</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                                <FiInfo size={12} />
                                These are estimates only. Final rates may vary based on actual shipment details and surcharges.
                            </p>
                        </div>
                    )}

                    {/* ── Banner ── */}
                    <div className="relative bg-white border-t border-gray-100 px-8 py-10 overflow-hidden">
                        {/* Background road illustration */}
                        <div className="absolute right-0 bottom-0 opacity-10 text-[180px] select-none pointer-events-none leading-none">
                            🛣️
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Get the Best Shipping Deals</h2>
                                <p className="text-lg font-bold text-[var(--color-primary)] mb-5">Fast, Secure &amp; Budget-Friendly</p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 font-medium">
                                    <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                                        <FiUser size={14} className="text-[var(--color-primary)]" /> Seller
                                    </span>
                                    <FiArrowRight size={14} className="text-gray-300" />
                                    <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                                        <FiHome size={14} className="text-[var(--color-primary)]" /> Source Warehouse
                                    </span>
                                    <FiArrowRight size={14} className="text-gray-300" />
                                    <span className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
                                        <FiMapPin size={14} className="text-[var(--color-primary)]" /> Doorstep Delivery
                                    </span>
                                </div>
                            </div>
                            {/* Illustration */}
                            <div className="flex-shrink-0 text-[90px] select-none flex flex-col items-center">
                                <span>✈️</span>
                                <span className="text-4xl mt-[-10px]">📍</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CostCalculatorPage;

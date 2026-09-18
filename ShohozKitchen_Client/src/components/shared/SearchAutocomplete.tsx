/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FiSearch, FiMic, FiX } from 'react-icons/fi';
import { useSuggestProductsQuery } from '@/redux/api/productApi';

/* ───────────────────────── Web Speech API typing ─────────────────────────
   The Web Speech API is not in the standard TS DOM lib, so we declare the
   minimal surface we use and cast through `unknown` to stay tsc-clean. */
interface SpeechRecognitionAlternativeLike {
    transcript: string;
}
interface SpeechRecognitionResultLike {
    0: SpeechRecognitionAlternativeLike;
    isFinal: boolean;
}
interface SpeechRecognitionEventLike {
    results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((e: SpeechRecognitionEventLike) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/* ─────────────────────────── suggestion shapes ─────────────────────────── */
interface SuggestProduct {
    _id: string;
    name: string;
    slug: string;
    thumbnail?: string;
    price?: number;
    discount?: number;
}
interface SuggestCategory {
    _id: string;
    name: string;
    slug: string;
}

interface SearchAutocompleteProps {
    /** Shared search text (controlled by Header so both inputs stay in sync). */
    value: string;
    onChange: (v: string) => void;
    /** Submit the full-text search to the listing page. */
    onSubmit: (term: string) => void;
    /** Visual variant — desktop pill is taller, mobile is compact. */
    variant?: 'desktop' | 'mobile';
    placeholder?: string;
    /** Slot rendered before the input (e.g. desktop category selector). */
    leading?: React.ReactNode;
}

const DEBOUNCE_MS = 300;

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
    value,
    onChange,
    onSubmit,
    variant = 'desktop',
    placeholder = 'Search products, brands, categories…',
    leading,
}) => {
    const router = useRouter();
    const pathname = usePathname();

    const [open, setOpen] = useState(false);
    const [debounced, setDebounced] = useState('');
    const [listening, setListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);

    const rootRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

    const isMobile = variant === 'mobile';

    /* feature-detect voice support once on mount (client-only) */
    useEffect(() => {
        setSpeechSupported(getSpeechRecognitionCtor() !== null);
    }, []);

    /* debounce the query term ~300ms */
    useEffect(() => {
        const term = value.trim();
        const t = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
        return () => clearTimeout(t);
    }, [value]);

    const trimmed = value.trim();
    const skip = debounced.length === 0;

    const { data, isFetching } = useSuggestProductsQuery(
        { q: debounced, limit: 8 },
        { skip },
    );

    const products: SuggestProduct[] = data?.data?.products ?? [];
    const categories: SuggestCategory[] = data?.data?.categories ?? [];
    const hasResults = products.length > 0 || categories.length > 0;

    /* close on outside click */
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, []);

    /* close on route change */
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    /* stop any in-flight recognition on unmount */
    useEffect(() => {
        return () => {
            try { recognitionRef.current?.abort(); } catch { /* noop */ }
        };
    }, []);

    const submit = (term: string) => {
        setOpen(false);
        onSubmit(term);
    };

    const goToProduct = (slug: string) => {
        setOpen(false);
        router.push(`/product/${slug}`);
    };

    const goToCategory = (id: string) => {
        setOpen(false);
        router.push(`/products?category=${id}`);
    };

    const startVoice = () => {
        const Ctor = getSpeechRecognitionCtor();
        if (!Ctor) return;
        // toggle off if already listening
        if (listening) {
            try { recognitionRef.current?.stop(); } catch { /* noop */ }
            return;
        }
        try {
            const rec = new Ctor();
            rec.lang = 'en-US';
            rec.continuous = false;
            rec.interimResults = false;
            rec.maxAlternatives = 1;
            rec.onresult = (e) => {
                const transcript = e.results?.[0]?.[0]?.transcript?.trim();
                if (transcript) {
                    onChange(transcript);
                    submit(transcript);
                }
            };
            rec.onerror = () => setListening(false);
            rec.onend = () => setListening(false);
            recognitionRef.current = rec;
            setListening(true);
            rec.start();
        } catch {
            setListening(false);
        }
    };

    const fmtPrice = (p?: number) =>
        typeof p === 'number' ? `৳${p.toLocaleString()}` : '';

    /* ───────────────────────────── render ───────────────────────────── */
    return (
        <div ref={rootRef} className="relative w-full">
            <div
                className={`flex items-center w-full bg-white transition-shadow duration-200 focus-within:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)] ${
                    isMobile ? 'h-[42px] rounded-md' : 'h-[46px] rounded-md'
                }`}
                style={{ border: '2px solid var(--color-primary)' }}
            >
                {leading}

                {/* Text input */}
                <input
                    type="text"
                    value={value}
                    onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                    onFocus={() => { if (trimmed) setOpen(true); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') submit(value);
                        else if (e.key === 'Escape') setOpen(false);
                    }}
                    placeholder={placeholder}
                    className={`flex-1 h-full text-gray-700 placeholder-gray-400 focus:outline-none text-sm bg-transparent ${
                        isMobile ? 'px-2.5' : 'px-3'
                    }`}
                    aria-label="Search"
                    autoComplete="off"
                />

                {/* Voice search mic — hidden when unsupported */}
                {speechSupported && (
                    <button
                        type="button"
                        onClick={startVoice}
                        aria-label={listening ? 'Stop voice search' : 'Search by voice'}
                        title={listening ? 'Listening… click to stop' : 'Search by voice'}
                        className={`shrink-0 flex items-center justify-center rounded-full transition-colors ${
                            isMobile ? 'w-8 h-8 mr-1' : 'w-9 h-9 mr-1.5'
                        } ${listening ? 'animate-pulse' : 'hover:bg-[var(--color-primary-lightest)]'}`}
                        style={listening ? { background: 'var(--color-primary)', color: '#fff' } : { color: 'var(--color-primary)' }}
                    >
                        <FiMic size={isMobile ? 15 : 17} strokeWidth={2} />
                    </button>
                )}

                {/* Search button — sits flush at the right edge of the field */}
                <button
                    type="button"
                    onClick={() => submit(value)}
                    className={`shrink-0 rounded text-white font-semibold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 active:opacity-75 ${
                        isMobile ? 'px-3.5 h-[34px] mr-[3px] text-sm' : 'px-5 h-[38px] mr-[3px] text-sm'
                    }`}
                    style={{ background: 'var(--color-primary)' }}
                    aria-label="Search"
                >
                    <FiSearch size={16} strokeWidth={2.4} />
                    {!isMobile && <span className="hidden lg:inline">Search</span>}
                </button>
            </div>

            {/* ─────────────── Autocomplete dropdown ─────────────── */}
            {open && trimmed.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl shadow-gray-900/15 border border-gray-100 z-[60] overflow-hidden max-h-[70vh] overflow-y-auto">
                    {/* Loading */}
                    {isFetching && !hasResults && (
                        <div className="px-4 py-6 text-center text-[13px] text-gray-400">
                            Searching…
                        </div>
                    )}

                    {/* No results */}
                    {!isFetching && !hasResults && (
                        <div className="px-4 py-6 text-center text-[13px] text-gray-400">
                            No matches for “{trimmed}”
                        </div>
                    )}

                    {/* Category matches */}
                    {categories.length > 0 && (
                        <div className="py-1.5">
                            <p className="px-4 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                                Categories
                            </p>
                            {categories.map((cat) => (
                                <button
                                    key={cat._id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => goToCategory(cat._id)}
                                    className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-[13px] text-gray-700 hover:bg-[var(--color-primary-lightest)] hover:text-[var(--color-primary)] transition-colors"
                                >
                                    <FiSearch size={13} className="shrink-0 text-gray-400" />
                                    <span className="truncate">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Product matches */}
                    {products.length > 0 && (
                        <div className={`py-1.5 ${categories.length > 0 ? 'border-t border-gray-100' : ''}`}>
                            <p className="px-4 pt-1 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400">
                                Products
                            </p>
                            {products.map((p) => (
                                <button
                                    key={p._id}
                                    type="button"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => goToProduct(p.slug)}
                                    className="w-full flex items-center gap-3 text-left px-4 py-2 hover:bg-[var(--color-primary-lightest)] transition-colors group"
                                >
                                    <span className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                                        {p.thumbnail ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <FiSearch size={14} className="text-gray-300" />
                                        )}
                                    </span>
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-[13px] text-gray-700 truncate group-hover:text-[var(--color-primary)] transition-colors">
                                            {p.name}
                                        </span>
                                        {typeof p.price === 'number' && (
                                            <span className="block text-[12.5px] font-semibold" style={{ color: 'var(--color-primary)' }}>
                                                {fmtPrice(p.price)}
                                            </span>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Footer: full search */}
                    {hasResults && (
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => submit(value)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[12.5px] font-semibold border-t border-gray-100 hover:bg-[var(--color-primary-lightest)] transition-colors"
                            style={{ color: 'var(--color-primary)' }}
                        >
                            <FiSearch size={13} strokeWidth={2.2} />
                            See all results for “{trimmed}”
                        </button>
                    )}
                </div>
            )}

            {/* Listening overlay hint (mobile + desktop) */}
            {listening && (
                <div className="absolute top-full left-0 right-0 mt-2 z-[55] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white shadow-lg border border-gray-100 text-[12.5px] text-gray-600">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'var(--color-primary)' }} />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: 'var(--color-primary)' }} />
                    </span>
                    Listening… speak now
                    <button
                        type="button"
                        onClick={() => { try { recognitionRef.current?.stop(); } catch { /* noop */ } }}
                        className="ml-1 text-gray-400 hover:text-gray-600"
                        aria-label="Stop listening"
                    >
                        <FiX size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchAutocomplete;

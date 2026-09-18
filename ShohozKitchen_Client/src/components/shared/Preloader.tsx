"use client";

import React, { useState, useEffect, useRef } from 'react';
import Logo from '@/components/shared/Logo';

const PRIMARY = 'var(--color-primary)';
const DARK    = '#111827';

/* ─── Delivery Truck (faces right, orange body + dark cab) ─── */
const TruckIcon: React.FC<{ moving: boolean }> = ({ moving }) => {
    const Wheel: React.FC<{ cx: number; cy: number }> = ({ cx, cy }) => (
        <g transform={`translate(${cx},${cy})`}>
            <circle r={6} fill="#1F2937" />
            <g style={{
                animation: moving ? 'preloaderWheelSpin 0.38s linear infinite' : 'none',
                transformOrigin: '0 0',
            }}>
                <circle r={3.8} fill="#374151" />
                <line x1={0} y1={-3.8} x2={0} y2={3.8} stroke="#6B7280" strokeWidth={1.2} />
                <line x1={-3.8} y1={0} x2={3.8} y2={0} stroke="#6B7280" strokeWidth={1.2} />
                <circle r={1.3} fill="#6B7280" />
            </g>
            <circle r={6} fill="none" stroke="#374151" strokeWidth={1} />
        </g>
    );

    return (
        <svg width="60" height="38" viewBox="0 0 60 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Chassis */}
            <rect x="2" y="23" width="56" height="5" rx="2" fill="#0F172A" />

            {/* Cargo box */}
            <rect x="0" y="4" width="35" height="21" rx="3" fill={PRIMARY} />
            <rect x="3" y="7" width="29" height="15" rx="2" fill="rgba(0,0,0,0.15)" />
            {/* Cargo ribbing */}
            <line x1="13" y1="7" x2="13" y2="22" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <line x1="24" y1="7" x2="24" y2="22" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />

            {/* Cab */}
            <rect x="35" y="9" width="23" height="17" rx="3" fill={DARK} />
            {/* Windshield */}
            <rect x="37" y="11" width="15" height="10" rx="2" fill="#BAE6FD" opacity="0.92" />
            <rect x="38" y="12" width="6" height="3.5" rx="1.5" fill="rgba(255,255,255,0.5)" />
            {/* Door line */}
            <line x1="50" y1="11" x2="50" y2="26" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
            {/* Headlight */}
            <rect x="56" y="19" width="4" height="5" rx="1.5" fill="#FDE68A" />
            <rect x="56.5" y="19.5" width="3" height="4" rx={1} fill="#FEF3C7" />

            {/* Exhaust (left side) */}
            {moving && (
                <>
                    <circle cx={-6}  cy={10} r={3}   fill="rgba(156,163,175,0.6)" style={{ animation: 'preloaderSmoke 1s ease-out infinite' }} />
                    <circle cx={-11} cy={5}  r={2.2} fill="rgba(156,163,175,0.35)" style={{ animation: 'preloaderSmoke 1s ease-out infinite', animationDelay: '0.33s' }} />
                    <circle cx={-15} cy={1}  r={1.5} fill="rgba(156,163,175,0.18)" style={{ animation: 'preloaderSmoke 1s ease-out infinite', animationDelay: '0.66s' }} />
                </>
            )}

            {/* Wheels */}
            <Wheel cx={11} cy={31} />
            <Wheel cx={46} cy={31} />
        </svg>
    );
};

/* ─── Main Preloader ─── */
const Preloader: React.FC = () => {
    const [isLoading, setIsLoading]   = useState(true);
    const [fadeOut, setFadeOut]       = useState(false);
    const [progress, setProgress]     = useState(0);

    const pageLoadedRef = useRef(false);
    const dataReadyRef  = useRef(false);
    const finishedRef   = useRef(false);

    useEffect(() => {
        const markPage = () => { pageLoadedRef.current = true; };
        if (document.readyState === 'complete') pageLoadedRef.current = true;
        else window.addEventListener('load', markPage);

        const markData = () => { dataReadyRef.current = true; };
        window.addEventListener('shohozkitchen:dataReady', markData);

        const finish = () => {
            if (finishedRef.current) return;
            finishedRef.current = true;
            setProgress(100);
            setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => setIsLoading(false), 650);
            }, 600);
        };

        const tick = setInterval(() => {
            setProgress(prev => {
                if (finishedRef.current) return prev;
                const bothReady = pageLoadedRef.current && dataReadyRef.current;
                if (bothReady) {
                    const next = prev + Math.max(4, (100 - prev) * 0.32);
                    if (next >= 100) { clearInterval(tick); finish(); return 100; }
                    return next;
                }
                const ceiling = pageLoadedRef.current ? 85 : dataReadyRef.current ? 60 : 80;
                if (prev >= ceiling) return ceiling;
                return prev + Math.max(1.2, (ceiling - prev) * 0.09);
            });
        }, 75);

        const safety = setTimeout(finish, 10000);
        return () => {
            clearInterval(tick);
            clearTimeout(safety);
            window.removeEventListener('load', markPage);
            window.removeEventListener('shohozkitchen:dataReady', markData);
        };
    }, []);

    if (!isLoading) return null;

    const rounded = Math.round(Math.min(progress, 100));
    const moving  = rounded > 1 && rounded < 100;

    const statusLabel =
        rounded < 30 ? 'Initializing store…' :
        rounded < 65 ? 'Loading products…'   :
        rounded < 95 ? 'Almost ready…'       :
        'Welcome!';

    return (
        <div
            className={`fixed inset-0 z-[99999] flex items-center justify-center transition-all duration-700 ease-out ${fadeOut ? 'opacity-0 scale-[1.015]' : 'opacity-100 scale-100'}`}
            style={{
                background: 'linear-gradient(160deg, var(--color-primary-surface) 0%, #ffffff 45%, #ffffff 100%)',
                pointerEvents: fadeOut ? 'none' : 'auto',
            }}
        >
            {/* Scanning top stripe */}
            <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                    background: `linear-gradient(90deg, transparent, ${PRIMARY}, var(--color-secondary), ${PRIMARY}, transparent)`,
                    backgroundSize: '200% 100%',
                    animation: 'preloaderBarScan 2.2s ease-in-out infinite',
                }}
            />

            {/* Soft glow */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[280px] pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(var(--color-primary-rgb), 0.06) 0%, transparent 70%)' }}
            />

            {/* ── Centered, single organized column ── */}
            <div
                className="relative z-10 w-full flex flex-col items-center"
                style={{ maxWidth: 380, padding: '0 28px' }}
            >
                {/* Brand Logo */}
                <div
                    className="flex items-center gap-3 select-none"
                    style={{ animation: 'preloaderFadeUp 0.55s ease-out both' }}
                    aria-label="Shohoz Kitchen"
                >
                    <Logo size={120} />
                </div>

                {/* Percentage */}
                <div
                    className="flex items-baseline justify-center gap-1 mt-10"
                    style={{ animation: 'preloaderFadeUp 0.55s ease-out 0.18s both' }}
                >
                    <span className="text-[44px] font-extrabold tabular-nums leading-none" style={{ color: DARK }}>
                        {rounded}
                    </span>
                    <span className="text-[22px] font-extrabold" style={{ color: PRIMARY }}>%</span>
                </div>

                {/* Truck + Road */}
                <div
                    className="w-full mt-5"
                    style={{ animation: 'preloaderFadeUp 0.55s ease-out 0.24s both' }}
                >
                    {/* Truck zone */}
                    <div className="relative" style={{ height: 42 }}>
                        <div
                            className="absolute bottom-0"
                            style={{
                                left: `clamp(30px, ${rounded}%, calc(100% - 30px))`,
                                transform: 'translateX(-50%)',
                                transition: 'left 0.28s ease-out',
                            }}
                        >
                            <TruckIcon moving={moving} />
                        </div>
                    </div>

                    {/* Road / progress line */}
                    <div className="relative h-[3px] w-full rounded-full" style={{ background: 'rgba(var(--color-primary-rgb), 0.12)' }}>
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                backgroundImage: `repeating-linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.22) 0px, rgba(var(--color-primary-rgb), 0.22) 14px, transparent 14px, transparent 24px)`,
                            }}
                        />
                        <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out"
                            style={{
                                width: `${rounded}%`,
                                background: `linear-gradient(90deg, ${PRIMARY} 0%, var(--color-secondary) 100%)`,
                                boxShadow: `0 0 10px rgba(var(--color-primary-rgb), 0.5)`,
                            }}
                        />
                    </div>
                </div>

                {/* Status line */}
                <div
                    className="flex items-center justify-center gap-2 mt-5 h-4"
                    style={{ animation: 'preloaderFadeUp 0.55s ease-out 0.3s both' }}
                >
                    <p className="text-[11.5px] font-medium text-gray-400 tracking-wide">{statusLabel}</p>
                    {moving && (
                        <span className="flex gap-1 items-center">
                            {[0, 1, 2].map(i => (
                                <span
                                    key={i}
                                    className="w-1 h-1 rounded-full"
                                    style={{
                                        background: PRIMARY,
                                        animation: `preloaderDotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                                    }}
                                />
                            ))}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Preloader;

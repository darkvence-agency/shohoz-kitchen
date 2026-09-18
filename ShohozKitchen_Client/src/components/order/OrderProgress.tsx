"use client";

/**
 * OrderProgress — a professional, animated, fully-responsive order-journey
 * stepper shared by the user and admin dashboards (and public tracking).
 *
 * • Desktop (md+): horizontal stepper with an animated gradient fill, a pulsing
 *   "current" node, check-marked completed steps and per-step timestamps.
 * • Mobile (<md): a proper vertical timeline (not a horizontal scroll).
 * • Terminal states (cancelled / returned / refunded) render the reached steps
 *   plus a clearly-styled terminal node in that status colour.
 *
 * Drop-in: <OrderProgress status={order.status} timeline={order.timeline} />
 */
import React, { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import { FiCheck } from 'react-icons/fi';
import { FORWARD_STEPS, getStatusConfig, statusProgressIndex } from '@/lib/orderStatus';

const PRIMARY = 'var(--color-primary, var(--color-primary))';

export interface OrderProgressProps {
    status: string;
    timeline?: Array<{ status?: string; action?: string; note?: string; createdAt?: string }>;
    /** Wrap in a titled card (default). Set false to render just the stepper. */
    card?: boolean;
    title?: string;
    className?: string;
}

type StepState = 'done' | 'current' | 'upcoming' | 'terminal';
interface StepView {
    key: string;
    label: string;
    Icon: ElementType;
    state: StepState;
    time: string;
    /** tailwind bg class for terminal node colour, e.g. "bg-red-500" */
    dot?: string;
    badgeText?: string;
    badgeBg?: string;
}

const fmt = (d?: string): string => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return (
        dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
        ' · ' +
        dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    );
};

export default function OrderProgress({
    status,
    timeline = [],
    card = true,
    title = 'Order Journey',
    className = '',
}: OrderProgressProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 90);
        return () => clearTimeout(t);
    }, []);

    const forwardIdx = statusProgressIndex(status);
    const isTerminal = forwardIdx < 0;

    const timeFor = (step: string): string => {
        const evs = timeline.filter((t) => (t.status || t.action) === step);
        return evs.length ? fmt(evs[evs.length - 1].createdAt) : '';
    };

    // How far along the forward chain we got (for terminal states, infer from timeline).
    let reachedIdx = forwardIdx;
    if (isTerminal) {
        const idxs = timeline
            .map((t) => statusProgressIndex(t.status || t.action || ''))
            .filter((i) => i >= 0);
        reachedIdx = idxs.length ? Math.max(...idxs) : 0;
    }
    reachedIdx = Math.max(0, reachedIdx);

    // Build the list of steps to render + the fill target.
    let steps: StepView[];
    let fillTargetPct: number;
    if (!isTerminal) {
        const isComplete = forwardIdx === FORWARD_STEPS.length - 1; // delivered = fully complete
        steps = FORWARD_STEPS.map((k, i) => {
            const cfg = getStatusConfig(k);
            return {
                key: k,
                label: cfg.label,
                Icon: cfg.icon,
                state: i < forwardIdx ? 'done' : i === forwardIdx ? (isComplete ? 'done' : 'current') : 'upcoming',
                time: timeFor(k),
            };
        });
        fillTargetPct = FORWARD_STEPS.length > 1 ? (forwardIdx / (FORWARD_STEPS.length - 1)) * 100 : 0;
    } else {
        const reached: StepView[] = FORWARD_STEPS.slice(0, reachedIdx + 1).map((k) => {
            const cfg = getStatusConfig(k);
            return { key: k, label: cfg.label, Icon: cfg.icon, state: 'done', time: timeFor(k) };
        });
        const tcfg = getStatusConfig(status);
        reached.push({
            key: status,
            label: tcfg.label,
            Icon: tcfg.icon,
            state: 'terminal',
            time: timeFor(status),
            dot: tcfg.dot,
            badgeText: tcfg.badgeText,
            badgeBg: tcfg.badgeBg,
        });
        steps = reached;
        fillTargetPct = 100;
    }
    const fillPct = mounted ? fillTargetPct : 0;

    const cur = getStatusConfig(status);
    const CurIcon = cur.icon;

    // ── Node bubble (shared by both layouts) ──────────────────────────
    const Node = ({ s, size }: { s: StepView; size: number }) => {
        const done = s.state === 'done';
        const current = s.state === 'current';
        const terminal = s.state === 'terminal';
        const Icon = s.Icon;
        const base = 'rounded-full flex items-center justify-center shrink-0 transition-all duration-500';
        let cls = 'bg-gray-100 text-gray-300';
        const style: React.CSSProperties = { width: size, height: size };
        if (done) {
            cls = 'text-white';
            style.background = PRIMARY;
            style.boxShadow = '0 4px 12px rgba(var(--color-primary-rgb), 0.28)';
        } else if (current) {
            cls = 'text-white km-pulse';
            style.background = PRIMARY;
        } else if (terminal) {
            cls = `${s.dot || 'bg-gray-500'} text-white`;
            style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        }
        return (
            <div className={`${base} ${cls}`} style={style} aria-current={current ? 'step' : undefined}>
                {done ? <FiCheck size={size * 0.42} aria-hidden /> : <Icon size={size * 0.42} aria-hidden />}
            </div>
        );
    };

    const inner = (
        <>
            {/* ── Desktop: horizontal ── */}
            <div className="hidden md:block">
                <div className="relative flex items-start justify-between">
                    {/* Track */}
                    <div className="absolute left-0 right-0 top-6 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                            className="h-full rounded-full relative"
                            style={{
                                width: `${fillPct}%`,
                                background: `linear-gradient(90deg, ${PRIMARY}, #ff9d6b)`,
                                transition: 'width 1100ms cubic-bezier(0.22,1,0.36,1)',
                            }}
                        >
                            <span className="km-shimmer absolute inset-0" />
                        </div>
                    </div>
                    {steps.map((s, i) => (
                        <div
                            key={s.key + i}
                            className="relative z-10 flex flex-1 flex-col items-center km-pop"
                            style={{ animationDelay: `${i * 70}ms` }}
                        >
                            <Node s={s} size={48} />
                            <p
                                className={`mt-2 text-center text-[11px] font-semibold leading-tight px-1 ${
                                    s.state === 'upcoming' ? 'text-gray-300' : s.state === 'terminal' ? s.badgeText : 'text-[var(--color-primary)]'
                                }`}
                            >
                                {s.label}
                            </p>
                            {s.time && <p className="mt-0.5 text-[9.5px] text-gray-400 text-center leading-tight">{s.time}</p>}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Mobile: vertical timeline ── */}
            <div className="md:hidden">
                {steps.map((s, i) => {
                    const last = i === steps.length - 1;
                    const lineOn = s.state === 'done'; // filled line beneath completed steps
                    return (
                        <div
                            key={s.key + i}
                            className="relative flex gap-3.5 km-pop"
                            style={{ animationDelay: `${i * 70}ms`, paddingBottom: last ? 0 : 18 }}
                        >
                            {!last && (
                                <span
                                    className="absolute w-0.5 rounded-full"
                                    style={{
                                        left: 19,
                                        top: 40,
                                        bottom: 2,
                                        background: lineOn ? PRIMARY : '#eceef1',
                                        transition: 'background 500ms ease',
                                    }}
                                />
                            )}
                            <Node s={s} size={40} />
                            <div className="pt-1.5 min-w-0">
                                <p
                                    className={`text-[13px] font-bold leading-tight ${
                                        s.state === 'upcoming' ? 'text-gray-300' : s.state === 'terminal' ? s.badgeText : 'text-gray-800'
                                    }`}
                                >
                                    {s.label}
                                    {s.state === 'current' && (
                                        <span className="ml-2 align-middle text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                                            In progress
                                        </span>
                                    )}
                                </p>
                                {s.time && <p className="text-[11px] text-gray-400 mt-0.5">{s.time}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );

    const styleTag = (
        <style jsx global>{`
            @keyframes kmPulseRing {
                0% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0.5); }
                70% { box-shadow: 0 0 0 12px rgba(var(--color-primary-rgb), 0); }
                100% { box-shadow: 0 0 0 0 rgba(var(--color-primary-rgb), 0); }
            }
            @keyframes kmShimmerMove {
                0% { transform: translateX(-120%); }
                100% { transform: translateX(220%); }
            }
            @keyframes kmPopIn {
                0% { opacity: 0; transform: translateY(6px) scale(0.9); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            .km-pulse { animation: kmPulseRing 1.8s ease-out infinite; }
            .km-pop { animation: kmPopIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
            .km-shimmer {
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
                width: 40%;
                animation: kmShimmerMove 1.9s ease-in-out infinite;
            }
        `}</style>
    );

    if (!card) return <div className={className}>{styleTag}{inner}</div>;

    return (
        <div className={`bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm ${className}`}>
            {styleTag}
            <div className="flex items-center justify-between gap-3 mb-6">
                <h2 className="text-sm sm:text-base font-bold text-gray-800">{title}</h2>
                <span className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full ${cur.badgeBg} ${cur.badgeText}`}>
                    <CurIcon size={13} /> {cur.label}
                </span>
            </div>
            {inner}
        </div>
    );
}

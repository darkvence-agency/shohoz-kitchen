"use client";

/**
 * Shared building blocks for admin pages, matching the client's dashboard design:
 * pill buttons and filters, bordered rounded tables, soft status badges, a
 * "Showing x–y of z" pager and a kebab row menu.
 *
 * Colours: brand elements use var(--color-primary); status colours stay semantic
 * (green = active/paid/delivered, amber = warning, red = error).
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { LuSearch, LuChevronsUpDown, LuChevronLeft, LuChevronRight, LuEllipsisVertical, LuX } from 'react-icons/lu';

/* ─── Formatting ─────────────────────────────────────────── */

/** ৳1,61,938 — South-Asian grouping, the way the client's screens show money. */
export const taka = (n: number | null | undefined, decimals = 0) =>
    '৳' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** 22 Aug 2026, 4:51 am */
export const fmtDateTime = (d?: string | Date) =>
    d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

/** 22 Aug 2026 */
export const fmtDate = (d?: string | Date) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/* ─── Page header ────────────────────────────────────────── */

export function PageHeader({ title, subtitle, actions, back }: {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
    back?: { href: string; label: string };
}) {
    return (
        <div className="mb-6">
            {back && (
                <Link href={back.href} className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
                    <LuChevronLeft size={16} /> {back.label}
                </Link>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-semibold tracking-tight text-gray-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
                </div>
                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
        </div>
    );
}

/* ─── Buttons ────────────────────────────────────────────── */

const BTN_BASE = 'inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';
const BTN_VARIANT = {
    primary: 'bg-[var(--color-primary)] text-white shadow-sm hover:bg-[var(--color-primary-dark)]',
    secondary: 'border border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
};

type BtnProps = {
    variant?: keyof typeof BTN_VARIANT;
    href?: string;
    icon?: React.ReactNode;
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Btn({ variant = 'secondary', href, icon, className, children, ...rest }: BtnProps) {
    const cls = cx(BTN_BASE, BTN_VARIANT[variant], className);
    if (href) return <Link href={href} className={cls}>{icon}{children}</Link>;
    return <button type="button" className={cls} {...rest}>{icon}{children}</button>;
}

/* ─── Filters ────────────────────────────────────────────── */

export function SearchInput({ value, onChange, placeholder = 'Search…', className }: {
    value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
    return (
        <div className={cx('relative w-full sm:w-72', className)}>
            <LuSearch size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-full border border-transparent bg-gray-100 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-border)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]"
            />
        </div>
    );
}

export function SelectPill({ value, onChange, options, className, ariaLabel }: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    className?: string;
    ariaLabel?: string;
}) {
    return (
        <div className={cx('relative', className)}>
            <select
                aria-label={ariaLabel}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full cursor-pointer appearance-none rounded-full border border-transparent bg-gray-100 pl-4 pr-10 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white"
            >
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <LuChevronsUpDown size={14} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
    );
}

export function Segmented<T extends string>({ value, onChange, options }: {
    value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[];
}) {
    return (
        <div className="inline-flex rounded-full bg-gray-100 p-1">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(o.value)}
                    className={cx(
                        'h-8 rounded-full px-4 text-sm font-medium transition',
                        value === o.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cx('mb-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>{children}</div>;
}

/* ─── Stat tiles ─────────────────────────────────────────── */

export function StatTile({ label, value, hint, icon, active, onClick }: {
    label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode;
    active?: boolean; onClick?: () => void;
}) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            className={cx(
                'rounded-2xl border bg-white p-4 text-left transition',
                active ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]' : 'border-gray-200',
                onClick && !active && 'hover:border-gray-300',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-500">{label}</p>
                {icon && <span className="text-gray-400">{icon}</span>}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </Tag>
    );
}

/* ─── Badges ─────────────────────────────────────────────── */

const TONES = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-violet-50 text-violet-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    sky: 'bg-sky-50 text-sky-700',
    teal: 'bg-teal-50 text-teal-700',
    amber: 'bg-amber-50 text-amber-700',
    orange: 'bg-orange-50 text-orange-700',
    red: 'bg-red-50 text-red-600',
    rose: 'bg-rose-50 text-rose-600',
    gray: 'bg-gray-100 text-gray-600',
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
    return (
        <span className={cx('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
            {children}
        </span>
    );
}

/** A <select> dressed as a badge — for statuses that can be changed in place. */
export function BadgeSelect({ value, onChange, options, tone, className, ariaLabel }: {
    value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
    tone: Tone; className?: string; ariaLabel?: string;
}) {
    return (
        <select
            aria-label={ariaLabel}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cx('cursor-pointer appearance-none rounded-md border-0 px-2 py-0.5 text-xs font-medium outline-none transition hover:brightness-95 focus:ring-2 focus:ring-[rgba(var(--color-primary-rgb),0.25)]', TONES[tone], className)}
        >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
}

/* ─── Tables ─────────────────────────────────────────────── */

export function TableCard({ children, footer, className }: { children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
    return (
        <>
            <div className={cx('overflow-hidden rounded-2xl border border-gray-200 bg-white', className)}>
                <div className="overflow-x-auto">{children}</div>
            </div>
            {footer}
        </>
    );
}

export const TH = 'px-4 py-3 text-left text-sm font-semibold text-gray-900 whitespace-nowrap';
export const TD = 'px-4 py-3.5 text-sm text-gray-700 align-middle';
export const TR = 'border-t border-gray-100 transition-colors hover:bg-gray-50/70';

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
    return (
        <tr>
            <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-gray-500">{children}</td>
        </tr>
    );
}

export function SkeletonRows({ rows = 5, cols }: { rows?: number; cols: number }) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="border-t border-gray-100">
                    {Array.from({ length: cols }).map((__, c) => (
                        <td key={c} className="px-4 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" style={{ width: c === 1 ? '70%' : '50%' }} /></td>
                    ))}
                </tr>
            ))}
        </>
    );
}

/* ─── Pager ──────────────────────────────────────────────── */

export function Pager({ page, totalPages, total, pageSize, count, onPage, noun = 'rows' }: {
    page: number; totalPages: number; total: number; pageSize: number;
    /** rows on this page (defaults to a full page) */
    count?: number;
    onPage: (p: number) => void;
    noun?: string;
}) {
    const pages = Math.max(1, totalPages || 1);
    const shown = count ?? Math.min(pageSize, total);
    const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = total === 0 ? 0 : from + shown - 1;
    const pill = 'inline-flex h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';
    return (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500">
                {total === 0 ? `No ${noun}` : `Showing ${from}–${to} of ${total.toLocaleString('en-IN')}`}
            </p>
            <div className="flex items-center gap-2">
                <button type="button" className={pill} disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    <LuChevronLeft size={15} /> Previous
                </button>
                <span className="px-1 text-sm text-gray-600">Page {page} of {pages}</span>
                <button type="button" className={pill} disabled={page >= pages} onClick={() => onPage(page + 1)}>
                    Next <LuChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}

/* ─── Row menu (kebab) ───────────────────────────────────── */

export type RowMenuItem =
    | { label: string; icon?: React.ReactNode; onClick: () => void; href?: never; danger?: boolean; hidden?: boolean }
    | { label: string; icon?: React.ReactNode; href: string; onClick?: never; danger?: boolean; hidden?: boolean };

/**
 * The dropdown is position:fixed so the table's overflow container can never clip it.
 */
export function RowMenu({ items, label = 'Actions' }: { items: RowMenuItem[]; label?: string }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const visible = items.filter((i) => !i.hidden);

    useLayoutEffect(() => {
        if (!open || !btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        const menuH = (menuRef.current?.offsetHeight || visible.length * 38 + 8);
        const menuW = 184;
        const below = r.bottom + 6 + menuH <= window.innerHeight;
        setPos({
            top: below ? r.bottom + 6 : Math.max(8, r.top - menuH - 6),
            left: Math.max(8, Math.min(window.innerWidth - menuW - 8, r.right - menuW)),
        });
    }, [open, visible.length]);

    useEffect(() => {
        if (!open) return;
        const close = (e: Event) => {
            const t = e.target as Node;
            if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onScroll = () => setOpen(false);
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onScroll);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
        };
    }, [open]);

    if (!visible.length) return null;
    const itemCls = (danger?: boolean) => cx(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
    );

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                aria-label={label}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={cx('inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800', open && 'bg-gray-100 text-gray-800')}
            >
                <LuEllipsisVertical size={16} />
            </button>
            {open && (
                <div
                    ref={menuRef}
                    role="menu"
                    style={{ position: 'fixed', top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: 184 }}
                    className="z-[200] rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
                >
                    {visible.map((it) => it.href ? (
                        <Link key={it.label} href={it.href} role="menuitem" className={itemCls(it.danger)} onClick={() => setOpen(false)}>
                            {it.icon}{it.label}
                        </Link>
                    ) : (
                        <button key={it.label} type="button" role="menuitem" className={itemCls(it.danger)} onClick={() => { setOpen(false); it.onClick?.(); }}>
                            {it.icon}{it.label}
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}

/* ─── Modal ──────────────────────────────────────────────── */

export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg' }: {
    open: boolean; onClose: () => void; title: React.ReactNode; subtitle?: React.ReactNode;
    children: React.ReactNode; footer?: React.ReactNode; width?: string;
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <div role="dialog" aria-modal="true" className={cx('relative flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-xl', width)}>
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
                    <div>
                        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
                        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100">
                        <LuX size={16} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
                {footer && <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">{footer}</div>}
            </div>
        </div>
    );
}

/* ─── Card (form sections, detail panels) ────────────────── */

export function Card({ title, description, actions, children, className }: {
    title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode;
    children: React.ReactNode; className?: string;
}) {
    return (
        <section className={cx('rounded-2xl border border-gray-200 bg-white p-5', className)}>
            {(title || actions) && (
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                        {title && <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>}
                        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
                    </div>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}

/* ─── Form fields ────────────────────────────────────────── */

export const INPUT = 'h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]';
export const TEXTAREA = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]';

export function Field({ label, required, hint, error, children, className }: {
    label: React.ReactNode; required?: boolean; hint?: React.ReactNode; error?: string;
    children: React.ReactNode; className?: string;
}) {
    return (
        <label className={cx('block', className)}>
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
                {label}{required && <span className="text-red-500"> *</span>}
            </span>
            {children}
            {error ? <span className="mt-1 block text-xs text-red-600">{error}</span>
                : hint ? <span className="mt-1 block text-xs text-gray-400">{hint}</span> : null}
        </label>
    );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode }) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-4 py-1">
            <span className="text-sm text-gray-700">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={cx('relative h-5 w-9 shrink-0 rounded-full transition', checked ? 'bg-[var(--color-primary)]' : 'bg-gray-300')}
            >
                <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
            </button>
        </label>
    );
}

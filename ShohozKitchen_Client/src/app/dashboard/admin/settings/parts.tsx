"use client";

import React from 'react';
import { LuCheck, LuInfo } from 'react-icons/lu';
import { Btn, cx } from '@/components/admin/ui';

/** A labelled group of cards on the Settings page (Business / Store / Account). */
export function SettingsSection({ id, title, description, children }: {
    id: string; title: string; description?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6">
            <div className="mb-3">
                <h2 id={`${id}-title`} className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
            </div>
            {children}
        </section>
    );
}

/** Soft grey explainer box, as in the client's design. */
export function Note({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cx('flex gap-2.5 rounded-xl bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-gray-500', className)}>
            <LuInfo size={14} className="mt-px shrink-0 text-gray-400" />
            <div className="min-w-0">{children}</div>
        </div>
    );
}

/** Per-card Save: disabled until something changed, with Discard and an optional note. */
export function SaveRow({ canSave, dirty, saving, onSave, onDiscard, label = 'Save', note }: {
    canSave: boolean; dirty: boolean; saving: boolean;
    onSave: () => void; onDiscard: () => void;
    label?: string; note?: React.ReactNode;
}) {
    return (
        <div className="mt-5 flex flex-wrap items-center gap-2">
            <Btn
                variant="primary"
                icon={saving ? undefined : <LuCheck size={15} />}
                disabled={!canSave || saving}
                onClick={onSave}
            >
                {saving ? 'Saving…' : label}
            </Btn>
            {dirty && !saving && <Btn variant="ghost" onClick={onDiscard}>Discard</Btn>}
            {note && <span className="text-xs text-gray-400">{note}</span>}
        </div>
    );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5" aria-hidden>
            <div className="h-4 w-44 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-gray-100" />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="mt-5 h-10 w-full animate-pulse rounded-xl bg-gray-100" />
            ))}
        </div>
    );
}

/**
 * An amount input with a leading unit (৳) or trailing unit (%). A text input with a
 * decimal keypad rather than type="number", so the mouse wheel can't silently change
 * a charge and half-typed values like "1." aren't wiped by the browser.
 */
export function UnitInput({ value, onChange, unit, unitSide = 'left', className, invalid, ...rest }: {
    value: string; onChange: (v: string) => void; unit: string; unitSide?: 'left' | 'right';
    className?: string; invalid?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'className'>) {
    return (
        <div className={cx('relative', className)}>
            <span className={cx(
                'pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-gray-400',
                unitSide === 'left' ? 'left-3' : 'right-3',
            )}>
                {unit}
            </span>
            <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={invalid || undefined}
                className={cx(
                    'h-10 w-full rounded-xl border bg-white text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
                    invalid ? 'border-red-300' : 'border-gray-200',
                    unitSide === 'left' ? 'pl-7 pr-3' : 'pl-3 pr-8',
                )}
                {...rest}
            />
        </div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * The form behind every Digital marketing page: a few fields from site content's
 * `marketing` or `seo` group, checked as you type against the same patterns the
 * server enforces, saved through the super-admin-only endpoints.
 *
 * Changes reach the live site within about a minute (the storefront caches site
 * content for 60 seconds) — no redeploy.
 */
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useGetSiteContentQuery, useUpdateMarketingMutation, useUpdateSeoMutation } from '@/redux/api/siteContentApi';
import { Card, Field, Btn, Badge, INPUT, TEXTAREA, cx } from '@/components/admin/ui';

export interface MarketingField {
    key: string;
    label: string;
    placeholder?: string;
    hint?: React.ReactNode;
    /** Shape the value must have once normalised (empty is always allowed). */
    pattern?: RegExp;
    message?: string;
    /** Applied before checking and saving — upper-casing, pulling a code out of a pasted tag. */
    normalize?: (v: string) => string;
    multiline?: boolean;
    mono?: boolean;
    /** Show a character count against this soft limit. */
    maxLength?: number;
    /** A value may not be left empty (the SEO title). */
    required?: boolean;
}

export const upper = (v: string) => v.trim().toUpperCase();

/** "<meta name=… content="abc" />" → "abc"; anything else is just trimmed. */
export const metaContent = (v: string) => {
    const m = v.match(/content\s*=\s*["']([^"']+)["']/i);
    return (m ? m[1] : v).trim();
};

const errMsg = (err: any, fallback: string) =>
    err?.data?.errorMessages?.[0]?.message || err?.data?.message || fallback;

export default function MarketingForm({ group, fields, title, description, showStatus = true }: {
    group: 'marketing' | 'seo';
    fields: MarketingField[];
    title: string;
    description?: string;
    /** Show "Active / Not set" beside each field (tracking IDs, not SEO text). */
    showStatus?: boolean;
}) {
    const { data, isLoading } = useGetSiteContentQuery(undefined);
    const saved: Record<string, string> = useMemo(() => {
        const src = data?.data?.[group] || {};
        return Object.fromEntries(fields.map((f) => [f.key, String(src[f.key] ?? '')]));
    }, [data, group, fields]);

    // Only what was typed lives in state, laid over the saved values — so a fresh
    // server copy shows through everywhere else (the same idea as Store settings).
    const [typed, setTyped] = useState<Record<string, string>>({});
    const draft: Record<string, string> = { ...saved, ...typed };
    const setDraft = (next: Record<string, string>) => setTyped((t) => ({ ...t, ...next }));

    const [updateMarketing, { isLoading: savingM }] = useUpdateMarketingMutation();
    const [updateSeo, { isLoading: savingS }] = useUpdateSeoMutation();
    const saving = savingM || savingS;

    const norm = (f: MarketingField, v: string) => (f.normalize ? f.normalize(v) : v.trim());
    const errorOf = (f: MarketingField) => {
        const v = norm(f, draft[f.key] ?? '');
        if (!v) return f.required ? `${f.label} cannot be empty` : undefined;
        if (f.pattern && !f.pattern.test(v)) return f.message || 'This does not look right';
        if (f.maxLength && v.length > f.maxLength * 2) return `Keep it under ${f.maxLength * 2} characters`;
        return undefined;
    };

    const changed = fields.filter((f) => norm(f, draft[f.key] ?? '') !== (saved[f.key] ?? ''));
    const hasErrors = fields.some((f) => errorOf(f));

    const onSave = async () => {
        if (!changed.length || hasErrors) return;
        const body = Object.fromEntries(changed.map((f) => [f.key, norm(f, draft[f.key] ?? '')]));
        try {
            await (group === 'marketing' ? updateMarketing(body) : updateSeo(body)).unwrap();
            setTyped({});
            toast.success('Saved — live on the site within a minute');
        } catch (err: any) {
            toast.error(errMsg(err, 'Could not save'));
        }
    };

    return (
        <Card title={title} description={description}>
            <div className="space-y-5">
                {fields.map((f) => {
                    // Only complain about what was just typed — never about old saved data.
                    const error = f.key in typed && typed[f.key] !== saved[f.key] ? errorOf(f) : undefined;
                    const active = Boolean(saved[f.key]);
                    const count = (draft[f.key] ?? '').length;
                    const label = (
                        <span className="inline-flex items-center gap-2">
                            {f.label}
                            {showStatus && (active
                                ? <Badge tone="green">Active</Badge>
                                : <Badge tone="gray">Not set</Badge>)}
                        </span>
                    );
                    const hint = f.maxLength
                        ? <>{f.hint}{f.hint ? ' · ' : ''}<span className={count > f.maxLength ? 'text-amber-600' : ''}>{count}/{f.maxLength} characters</span></>
                        : f.hint;
                    const common = {
                        value: draft[f.key] ?? '',
                        placeholder: f.placeholder,
                        disabled: isLoading,
                        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft({ ...draft, [f.key]: e.target.value }),
                    };
                    return (
                        <Field key={f.key} label={label} hint={hint} error={error} required={f.required}>
                            {f.multiline
                                ? <textarea {...common} rows={3} className={cx(TEXTAREA, 'resize-none', f.mono && 'font-mono')} />
                                : <input {...common} className={cx(INPUT, f.mono && 'font-mono')} spellCheck={false} autoComplete="off" />}
                        </Field>
                    );
                })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                {changed.length > 0 && (
                    <Btn onClick={() => setTyped({})} disabled={saving}>Discard</Btn>
                )}
                <Btn variant="primary" onClick={onSave} disabled={!changed.length || hasErrors || saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Btn>
            </div>
        </Card>
    );
}

/** A numbered "how to find it" list for the side of each page. */
export function HowTo({ title = 'Where to find it', steps, children }: { title?: string; steps: React.ReactNode[]; children?: React.ReactNode }) {
    return (
        <Card title={title}>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
                {steps.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            {children}
        </Card>
    );
}

/** A yellow note for the one thing people get wrong on each page. */
export function Note({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{children}</div>
    );
}

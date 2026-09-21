"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useGetSiteContentQuery, useUpdateSiteContentMutation } from '@/redux/api/siteContentApi';
import { SingleImageUploader } from '@/components/ui/ImageUploader';
import { Badge, Btn, Card, Field, INPUT, cx } from '@/components/admin/ui';
import { CardSkeleton, Note, SaveRow } from './parts';
import { apiError } from './helpers';
import Logo from '@/components/shared/Logo';

// Brand colours are fixed in the code (globals.css); only the logo is set here.
type Theme = { logoUrl?: string; faviconUrl?: string; logoHeight?: string };
type General = { storeName?: string; tagline?: string; currency?: string };
type SiteContent = { theme?: Theme; general?: General };

const CURRENCIES = [
    { value: 'BDT', label: '৳ BDT — Bangladeshi Taka' },
    { value: 'USD', label: '$ USD — US Dollar' },
    { value: 'EUR', label: '€ EUR — Euro' },
    { value: 'CNY', label: '¥ CNY — Chinese Yuan' },
];

/**
 * A section's form state: the saved values overlaid with whatever staff typed.
 * Only the typed keys live in state, so a fresh server copy shows through
 * everywhere else, and `dirty` is true only when a value really differs.
 */
function useSectionDraft<T extends Record<string, string | undefined>>(saved: T) {
    const [draft, setDraft] = useState<Partial<T>>({});
    const values = { ...saved, ...draft } as T;
    const changedKeys = (Object.keys(draft) as (keyof T)[]).filter((k) => (draft[k] ?? '') !== (saved[k] ?? ''));
    const set = <K extends keyof T>(k: K, v: T[K]) => setDraft((d) => ({ ...d, [k]: v }));
    const changed = (k: keyof T) => changedKeys.includes(k);
    return { values, set, changed, dirty: changedKeys.length > 0, discard: () => setDraft({}) };
}

/**
 * Settings → Store: brand colours & logo and store identity (site-content).
 * SEO and tracking IDs moved to Digital marketing, which only the super admin opens.
 */
export default function StoreSettings() {
    const { data: res, isLoading, isError, refetch } = useGetSiteContentQuery({});
    const content = (res as { data?: SiteContent } | undefined)?.data;

    if (isLoading) {
        return (
            <div className="space-y-5">
                <CardSkeleton lines={4} />
                <div className="grid items-start gap-5 lg:grid-cols-2"><CardSkeleton /><CardSkeleton /></div>
            </div>
        );
    }
    if (isError || !content) {
        return (
            <Card title="Couldn't load store settings" description="Brand colours and logo could not be fetched from the server.">
                <Btn onClick={() => refetch()}>Try again</Btn>
            </Card>
        );
    }

    const theme = content.theme || {};
    const general = content.general || {};

    // Keyed on the saved section, so a card resets once its save has been refetched.
    return (
        <div className="space-y-5">
            <LogoCard key={JSON.stringify(theme)} saved={{ logoUrl: theme.logoUrl, faviconUrl: theme.faviconUrl, logoHeight: theme.logoHeight ? String(theme.logoHeight) : undefined }} />
            <div className="grid items-start gap-5 lg:grid-cols-2">
                <StoreInfoCard key={JSON.stringify(general)} saved={general} />
                <Note>
                    The search-engine title and description, Google Analytics, Tag Manager, Meta and TikTok
                    pixels and Search Console are under <b>Digital marketing</b>, which the super admin manages.
                </Note>
            </div>
        </div>
    );
}

/* ─── Logo ────────────────────────────────────────────────── */

const LOGO_MIN = 24;
const LOGO_MAX = 80;
const LOGO_DEFAULT = 42;

function LogoCard({ saved }: { saved: Theme }) {
    const [update, { isLoading: saving }] = useUpdateSiteContentMutation();
    const { values, set, dirty, discard } = useSectionDraft<Theme>(saved);
    const height = Math.min(LOGO_MAX, Math.max(LOGO_MIN, Number(values.logoHeight) || LOGO_DEFAULT));
    const uploaded = values.logoUrl && values.logoUrl !== '/logo.svg';

    const onSave = async () => {
        try {
            await update({ theme: { logoUrl: values.logoUrl, faviconUrl: values.faviconUrl, logoHeight: height } }).unwrap();
            toast.success('Logo saved');
        } catch (err) {
            toast.error(apiError(err, 'Could not save the logo'));
        }
    };

    return (
        <Card title="Logo" description="The logo in the website header, how big it shows, and the browser-tab icon.">
            <div className="grid gap-4 md:grid-cols-2">
                <SingleImageUploader
                    label="Website logo"
                    hint="PNG or SVG with a transparent background, about 400×120px. Leave empty to use the built-in logo."
                    value={uploaded ? values.logoUrl || '' : ''}
                    onChange={(url) => set('logoUrl', url || '/logo.svg')}
                />
                <SingleImageUploader
                    label="Favicon"
                    hint="The browser-tab icon. 512×512px, square PNG or SVG."
                    value={values.faviconUrl || ''}
                    onChange={(url) => set('faviconUrl', url)}
                />
            </div>

            <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Logo size</span>
                    <span className="text-sm tabular-nums text-gray-500">{height}px tall</span>
                </div>
                <input
                    type="range" min={LOGO_MIN} max={LOGO_MAX} step={1} value={height}
                    onChange={(e) => set('logoHeight', e.target.value)}
                    className="w-full accent-[var(--color-primary)]"
                    aria-label="Logo size"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-400"><span>Smaller</span><span>Bigger</span></div>
            </div>

            {/* How the header will look */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Header preview</p>
                <div className="flex h-24 items-center rounded-lg bg-white px-4">
                    {uploaded
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={values.logoUrl} alt="Logo preview" style={{ height, width: 'auto', maxWidth: 260 }} className="object-contain" />
                        : <Logo size={height} />}
                </div>
            </div>

            <SaveRow canSave={dirty} dirty={dirty} saving={saving} onSave={onSave} onDiscard={discard} />
        </Card>
    );
}

/* ─── Store information ───────────────────────────────────── */

function StoreInfoCard({ saved }: { saved: General }) {
    const [update, { isLoading: saving }] = useUpdateSiteContentMutation();
    const { values, set, dirty, discard } = useSectionDraft<General>(saved);

    const onSave = async () => {
        try {
            await update({ general: values }).unwrap();
            toast.success('Store information saved');
        } catch (err) {
            toast.error(apiError(err, 'Could not save the store information'));
        }
    };

    return (
        <Card title="Store information" description="Your store's name, tagline and currency.">
            <div className="space-y-4">
                <Field label="Store name">
                    <input className={INPUT} value={values.storeName || ''} placeholder="Shohoz Kitchen"
                        onChange={(e) => set('storeName', e.target.value)} />
                </Field>
                <Field label="Tagline">
                    <input className={INPUT} value={values.tagline || ''} placeholder="Your trusted online marketplace"
                        onChange={(e) => set('tagline', e.target.value)} />
                </Field>
                <Field label="Currency">
                    <select className={cx(INPUT, 'cursor-pointer')} value={values.currency || 'BDT'}
                        onChange={(e) => set('currency', e.target.value)}>
                        {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </Field>
            </div>
            <Note className="mt-4">
                Phone, email, address and social links are edited in{' '}
                <Link href="/dashboard/admin/site-content" className="font-medium text-[var(--color-primary)] hover:underline">Site content</Link>.
            </Note>
            <SaveRow canSave={dirty} dirty={dirty} saving={saving} onSave={onSave} onDiscard={discard} />
        </Card>
    );
}


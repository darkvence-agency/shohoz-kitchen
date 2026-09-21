"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LuRotateCcw } from 'react-icons/lu';
import { useGetSiteContentQuery, useUpdateSiteContentMutation } from '@/redux/api/siteContentApi';
import { SingleImageUploader } from '@/components/ui/ImageUploader';
import { Badge, Btn, Card, Field, INPUT, cx } from '@/components/admin/ui';
import { CardSkeleton, Note, SaveRow } from './parts';
import { apiError, cssRootDefault, isHexColor } from './helpers';

type Theme = { primaryColor?: string; secondaryColor?: string; logoUrl?: string; faviconUrl?: string };
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
            <BrandCard key={JSON.stringify(theme)} saved={theme} storeName={general.storeName} />
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

/* ─── Brand colours & logo ────────────────────────────────── */

function BrandCard({ saved, storeName }: { saved: Theme; storeName?: string }) {
    const [update, { isLoading: saving }] = useUpdateSiteContentMutation();
    const { values, set, changed, dirty, discard } = useSectionDraft<Theme>(saved);
    // '' = use the built-in colour; anything else typed must be a full #rrggbb.
    const badColour = (['primaryColor', 'secondaryColor'] as const)
        .some((k) => changed(k) && !!values[k] && !isHexColor(values[k]));

    // The built-in colours from globals.css — shown when no custom colour is saved.
    const defaults = useMemo(() => ({
        primary: cssRootDefault('--color-primary'),
        secondary: cssRootDefault('--color-secondary'),
    }), []);
    const primary = isHexColor(values.primaryColor) ? values.primaryColor : (defaults.primary || 'var(--color-primary)');
    const secondary = isHexColor(values.secondaryColor) ? values.secondaryColor : (defaults.secondary || 'var(--color-secondary)');
    const usingDefaults = !isHexColor(values.primaryColor) && !isHexColor(values.secondaryColor);

    const onSave = async () => {
        try {
            await update({ theme: values }).unwrap();
            toast.success('Brand saved');
        } catch (err) {
            toast.error(apiError(err, 'Could not save the brand settings'));
        }
    };

    return (
        <Card
            title="Brand colours & logo"
            description="Your website's brand colour, accent colour, logo and browser-tab icon."
            actions={(
                <Btn
                    variant="ghost"
                    icon={<LuRotateCcw size={14} />}
                    disabled={usingDefaults}
                    onClick={() => { set('primaryColor', ''); set('secondaryColor', ''); }}
                >
                    Use default colours
                </Btn>
            )}
        >
            <div className="grid gap-4 md:grid-cols-2">
                <ColorField
                    label="Primary colour"
                    description="Buttons, links and highlights"
                    value={values.primaryColor || ''}
                    fallback={defaults.primary}
                    onChange={(v) => set('primaryColor', v)}
                />
                <ColorField
                    label="Secondary colour"
                    description="Sale badges and accent buttons"
                    value={values.secondaryColor || ''}
                    fallback={defaults.secondary}
                    onChange={(v) => set('secondaryColor', v)}
                />
            </div>

            {/* Live preview */}
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Preview</p>
                <div className="mb-3">
                    {values.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={values.logoUrl} alt="Logo preview" className="h-8 max-w-[200px] object-contain" />
                    ) : (
                        <span className="inline-flex h-8 items-center rounded-md px-3 text-sm font-semibold text-white" style={{ background: primary }}>
                            {storeName || 'Shohoz Kitchen'}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold text-white" style={{ background: primary }}>Buy now</span>
                    <span className="inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold text-white" style={{ background: secondary }}>Sale 50% off</span>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: primary }}>New arrival</span>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: secondary }}>Hot deal</span>
                    <span className="text-sm font-semibold underline" style={{ color: primary }}>Sample link</span>
                    <span className="text-sm font-semibold" style={{ color: secondary }}>৳2,499</span>
                </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SingleImageUploader
                    label="Website logo"
                    hint="Shown in the header and footer. 400×120px, PNG or SVG with a transparent background."
                    value={values.logoUrl || ''}
                    onChange={(url) => set('logoUrl', url)}
                />
                <SingleImageUploader
                    label="Favicon"
                    hint="The browser-tab icon. 512×512px, square PNG or SVG."
                    value={values.faviconUrl || ''}
                    onChange={(url) => set('faviconUrl', url)}
                />
            </div>

            <SaveRow
                canSave={dirty && !badColour}
                dirty={dirty}
                saving={saving}
                onSave={onSave}
                onDiscard={discard}
                note={badColour ? <span className="text-red-600">Enter colours as a 6-digit hex code (#rrggbb)</span> : undefined}
            />
        </Card>
    );
}

function ColorField({ label, description, value, fallback, onChange }: {
    label: string; description: string; value: string; fallback: string; onChange: (v: string) => void;
}) {
    const custom = isHexColor(value);
    const swatch = custom ? value : (isHexColor(fallback) ? fallback : '#000000');
    return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
            <input
                type="color"
                aria-label={`${label} picker`}
                value={swatch.toLowerCase()}
                onChange={(e) => onChange(e.target.value)}
                className="h-11 w-11 shrink-0 cursor-pointer rounded-lg border border-gray-200 bg-white p-0.5"
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800">{label}</p>
                    {!custom && <Badge tone="gray">Default</Badge>}
                </div>
                <p className="truncate text-xs text-gray-400">{description}</p>
            </div>
            <input
                type="text"
                aria-label={`${label} hex code`}
                value={value.startsWith('#') ? value : ''}
                placeholder={isHexColor(fallback) ? fallback : '#rrggbb'}
                maxLength={7}
                spellCheck={false}
                onChange={(e) => onChange(e.target.value.trim())}
                className={cx(INPUT, 'h-9 w-24 shrink-0 px-2.5 font-mono text-xs', value && value.startsWith('#') && !custom && 'border-red-300')}
            />
        </div>
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


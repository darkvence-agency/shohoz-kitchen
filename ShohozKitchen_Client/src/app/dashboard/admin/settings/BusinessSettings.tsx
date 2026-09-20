"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LuArrowUpRight, LuMapPin } from 'react-icons/lu';
import {
    useGetShippingSettingsQuery,
    useUpdateShippingSettingsMutation,
    useGetDeliveryZonesQuery,
    type ShippingSettings,
} from '@/redux/api/shippingApi';
import { Btn, Card, Field, Toggle, taka } from '@/components/admin/ui';
import { CardSkeleton, Note, SaveRow, UnitInput } from './parts';
import { apiError, bpsToPercentText, parseMoney, parsePercentToBps } from './helpers';

const SHIPPING_PAGE = '/dashboard/admin/shipping';
const DEFAULT_COD_BPS = 100; // mirrors DEFAULT_COD_CHARGE_BPS on the server (1%)
const EXAMPLE_PARCEL = 1000; // ৳ collected, for the worked example under the rate

/**
 * Settings → Business: the courier COD charge and the customer delivery charge.
 * Both cards read and write the shipping-settings singleton, the same record the
 * Shipping & Zones page edits, so the two pages always agree.
 */
export default function BusinessSettings() {
    const { data: settings, isLoading, isFetching, isError, refetch } = useGetShippingSettingsQuery();

    if (isLoading) {
        return (
            <div className="grid items-start gap-5 lg:grid-cols-2">
                <CardSkeleton lines={2} />
                <CardSkeleton lines={3} />
            </div>
        );
    }
    if (isError || !settings) {
        return (
            <Card title="Couldn't load business settings" description="The delivery and COD charges could not be fetched from the server.">
                <Btn onClick={() => refetch()}>Try again</Btn>
            </Card>
        );
    }

    const codBps = settings.codChargeBps ?? DEFAULT_COD_BPS;
    // Each card is keyed on the server values it edits: when fresh values arrive
    // (after its own save, or a change made on Shipping & Zones) it resets its
    // draft, while unsaved edits in the other card are left alone.
    const deliveryKey = [
        settings.defaultInsideDhakaRate, settings.defaultOutsideDhakaRate,
        settings.freeShippingThreshold, settings.freeShippingByThresholdEnabled,
    ].join('|');

    return (
        <div className="grid items-start gap-5 lg:grid-cols-2">
            <CodChargeCard key={`cod-${codBps}`} savedBps={codBps} insideRate={settings.defaultInsideDhakaRate} syncing={isFetching} />
            <DeliveryChargeCard key={deliveryKey} settings={settings} syncing={isFetching} />
        </div>
    );
}

/* ─── Courier COD handling charge ─────────────────────────── */

function CodChargeCard({ savedBps, insideRate, syncing }: { savedBps: number; insideRate: number; syncing: boolean }) {
    const [save, { isLoading: saving }] = useUpdateShippingSettingsMutation();
    const [draft, setDraft] = useState<string | null>(null);

    const text = draft ?? bpsToPercentText(savedBps);
    const parsed = parsePercentToBps(text);
    const bps = parsed.value;
    const changed = bps !== undefined && bps !== savedBps;
    const dirty = draft !== null && (changed || !!parsed.error);

    // Worked example: what the courier keeps on a typical Inside-Dhaka COD parcel.
    const exampleBps = bps ?? savedBps;
    const exampleDelivery = Math.min(insideRate || 0, EXAMPLE_PARCEL);
    const exampleCharge = ((EXAMPLE_PARCEL - exampleDelivery) * exampleBps) / 10000;

    const onSave = async () => {
        if (bps === undefined) return;
        try {
            await save({ codChargeBps: bps }).unwrap();
            toast.success(`COD charge set to ${bpsToPercentText(bps)}%`);
        } catch (err) {
            toast.error(apiError(err, 'Could not save the COD charge'));
        }
    };

    return (
        <Card
            title="Courier COD handling charge"
            description="What Steadfast keeps for collecting cash on delivery, applied to a parcel's collected amount minus its delivery charge."
        >
            <Field label="Rate (%)" error={parsed.error}>
                <div className="flex flex-wrap items-center gap-3">
                    <UnitInput
                        unit="%"
                        unitSide="right"
                        className="w-32"
                        value={text}
                        invalid={!!parsed.error}
                        onChange={setDraft}
                        aria-label="COD charge rate in percent"
                    />
                    {bps !== undefined && (
                        <span className="text-sm text-gray-500">
                            = {bps.toLocaleString('en-IN')} basis {bps === 1 ? 'point' : 'points'}
                        </span>
                    )}
                </div>
            </Field>

            {bps !== undefined && (
                <p className="mt-3 text-xs text-gray-500">
                    Example: on a {taka(EXAMPLE_PARCEL)} COD parcel with a {taka(exampleDelivery)} delivery charge,
                    the courier keeps <span className="font-medium text-gray-700">{taka(exampleCharge, 2)}</span>.
                </p>
            )}

            <Note className="mt-4">
                Applies to parcels booked with the courier from now on. Parcels already booked keep the rate they
                were booked at, so their payouts don&apos;t change.
            </Note>

            <SaveRow
                canSave={changed && !syncing}
                dirty={dirty}
                saving={saving}
                onSave={onSave}
                onDiscard={() => setDraft(null)}
                note={changed ? `Currently ${bpsToPercentText(savedBps)}%` : undefined}
            />
        </Card>
    );
}

/* ─── Delivery charge ─────────────────────────────────────── */

type DeliveryDraft = { inside?: string; outside?: string; threshold?: string; thresholdOn?: boolean };

function DeliveryChargeCard({ settings, syncing }: { settings: ShippingSettings; syncing: boolean }) {
    const [save, { isLoading: saving }] = useUpdateShippingSettingsMutation();
    const { data: zones = [] } = useGetDeliveryZonesQuery();
    const [draft, setDraft] = useState<DeliveryDraft>({});

    const insideText = draft.inside ?? String(settings.defaultInsideDhakaRate ?? 0);
    const outsideText = draft.outside ?? String(settings.defaultOutsideDhakaRate ?? 0);
    const thresholdText = draft.threshold ?? String(settings.freeShippingThreshold ?? 0);
    const thresholdOn = draft.thresholdOn ?? settings.freeShippingByThresholdEnabled;

    const inside = parseMoney(insideText);
    const outside = parseMoney(outsideText);
    const threshold = parseMoney(thresholdText);
    const thresholdError = threshold.error
        ?? (thresholdOn && threshold.value === 0 ? 'Enter an amount above ৳0, or turn free delivery off' : undefined);

    // Only send what changed, so a save here never overwrites a value someone
    // else just changed on Shipping & Zones.
    const patch: Partial<ShippingSettings> = {};
    if (inside.value !== undefined && inside.value !== settings.defaultInsideDhakaRate) patch.defaultInsideDhakaRate = inside.value;
    if (outside.value !== undefined && outside.value !== settings.defaultOutsideDhakaRate) patch.defaultOutsideDhakaRate = outside.value;
    if (threshold.value !== undefined && threshold.value !== settings.freeShippingThreshold) patch.freeShippingThreshold = threshold.value;
    if (thresholdOn !== settings.freeShippingByThresholdEnabled) patch.freeShippingByThresholdEnabled = thresholdOn;

    const hasError = !!(inside.error || outside.error || thresholdError);
    const changed = Object.keys(patch).length > 0;
    const dirty = Object.keys(draft).length > 0 && (changed || hasError);

    const onSave = async () => {
        try {
            await save(patch).unwrap();
            toast.success('Delivery charges saved');
        } catch (err) {
            toast.error(apiError(err, 'Could not save the delivery charges'));
        }
    };

    const hasZones = zones.length > 0;

    return (
        <Card
            title="Delivery charge"
            description={settings.freeShippingByThresholdEnabled && settings.freeShippingThreshold > 0
                ? `What a customer pays for delivery. Orders at or above the free delivery threshold pay ${taka(0)} regardless of zone.`
                : 'What a customer pays for delivery.'}
        >
            {hasZones && (
                <div className="mb-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3.5 py-2.5">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800">
                            <LuMapPin size={14} className="text-gray-400" /> Zones at checkout
                        </p>
                        <Link href={SHIPPING_PAGE} className="inline-flex items-center gap-0.5 text-xs font-medium text-[var(--color-primary)] hover:underline">
                            Edit zones <LuArrowUpRight size={13} />
                        </Link>
                    </div>
                    <ul className="divide-y divide-gray-100">
                        {zones.map((z) => (
                            <li key={z._id} className="flex items-center justify-between gap-3 px-3.5 py-2 text-sm">
                                <span className="min-w-0 truncate text-gray-700">{z.name}</span>
                                <span className="shrink-0 text-gray-500">
                                    <span className="font-medium text-gray-900">{taka(z.price)}</span>
                                    {z.estimatedDays && <span className="text-xs"> · {z.estimatedDays}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="border-t border-gray-100 px-3.5 py-2 text-xs text-gray-400">
                        Customers pick a zone at checkout and pay its rate. The charges below apply when no zone is picked or matched.
                    </p>
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Inside Dhaka"
                    error={inside.error}
                    hint={hasZones ? 'When no zone applies' : undefined}
                >
                    <UnitInput unit="৳" aria-label="Inside Dhaka delivery charge" value={insideText} invalid={!!inside.error}
                        onChange={(v) => setDraft((d) => ({ ...d, inside: v }))} />
                </Field>
                <Field
                    label="Outside Dhaka"
                    error={outside.error}
                    hint={hasZones ? 'When no zone applies' : undefined}
                >
                    <UnitInput unit="৳" aria-label="Outside Dhaka delivery charge" value={outsideText} invalid={!!outside.error}
                        onChange={(v) => setDraft((d) => ({ ...d, outside: v }))} />
                </Field>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4">
                <Toggle
                    label={<span className="font-medium text-gray-800">Free delivery over a set order value</span>}
                    checked={thresholdOn}
                    onChange={(v) => setDraft((d) => ({ ...d, thresholdOn: v }))}
                />
                <Field
                    className="mt-3"
                    label="Free delivery over"
                    error={thresholdOn ? thresholdError : threshold.error}
                    hint={thresholdOn
                        ? (threshold.value ? `Orders of ${taka(threshold.value)} or more pay ${taka(0)}, whatever the zone.` : undefined)
                        : 'Off: orders pay the delivery charge unless another free-delivery rule applies (coupon, product, item count or zone).'}
                >
                    <UnitInput unit="৳" aria-label="Free delivery threshold" className="sm:w-1/2" value={thresholdText} disabled={!thresholdOn}
                        invalid={!!(thresholdOn ? thresholdError : threshold.error)}
                        onChange={(v) => setDraft((d) => ({ ...d, threshold: v }))} />
                </Field>
            </div>

            <Note className="mt-4">
                These are the same numbers as{' '}
                <Link href={SHIPPING_PAGE} className="font-medium text-[var(--color-primary)] hover:underline">Shipping &amp; Zones</Link>
                {' '}→ Settings, so a change here shows there too. Zones, per-zone rates, delivery time and
                quantity-based free delivery are managed there.
            </Note>

            <SaveRow
                canSave={changed && !hasError && !syncing}
                dirty={dirty}
                saving={saving}
                onSave={onSave}
                onDiscard={() => setDraft({})}
            />
        </Card>
    );
}

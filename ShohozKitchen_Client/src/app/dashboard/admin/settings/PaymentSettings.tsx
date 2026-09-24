"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useGetSiteContentQuery, useUpdatePaymentSettingsMutation } from '@/redux/api/siteContentApi';
import { Btn, Card, Field, INPUT, TEXTAREA, Toggle, cx } from '@/components/admin/ui';
import { CardSkeleton, Note, SaveRow } from './parts';
import { apiError } from './helpers';

type Mobile = { number: string; accountType: string; active: boolean };
type Bank = { bankName: string; accountName: string; accountNumber: string; branch: string; routingNumber: string; active: boolean };
type Payment = { bkash: Mobile; nagad: Mobile; rocket: Mobile; bank: Bank; instructions: string };
type MobileKey = 'bkash' | 'nagad' | 'rocket';

const MOBILE_NUMBER = /^01\d{9}$/;
// A Rocket account number is the mobile number plus a check digit (12 digits); the plain
// 11-digit number is accepted too.
const ROCKET_NUMBER = /^01\d{9,10}$/;

// The mobile wallets, in the order they are listed here and at checkout.
const MOBILE_METHODS: ReadonlyArray<{ key: MobileKey; label: string; color: string; pattern: RegExp; format: string }> = [
    { key: 'bkash', label: 'bKash', color: '#E2136E', pattern: MOBILE_NUMBER, format: '01XXXXXXXXX' },
    { key: 'nagad', label: 'Nagad', color: '#F47920', pattern: MOBILE_NUMBER, format: '01XXXXXXXXX' },
    { key: 'rocket', label: 'Rocket', color: '#8C3EC0', pattern: ROCKET_NUMBER, format: '01XXXXXXXXX or 01XXXXXXXXXX' },
];

type Saved = Partial<Record<string, string | boolean>>;

// What the server has saved, with blanks for anything never set.
function fromServer(p: { bkash?: Saved; nagad?: Saved; rocket?: Saved; bank?: Saved; instructions?: string } = {}): Payment {
    const str = (v: unknown) => (typeof v === 'string' ? v : '');
    const mobile = (m: Saved = {}): Mobile => ({
        number: str(m.number), accountType: str(m.accountType) || 'Personal', active: m.active === true,
    });
    const b: Saved = p.bank || {};
    return {
        bkash: mobile(p.bkash),
        nagad: mobile(p.nagad),
        rocket: mobile(p.rocket),
        bank: {
            bankName: str(b.bankName), accountName: str(b.accountName), accountNumber: str(b.accountNumber),
            branch: str(b.branch), routingNumber: str(b.routingNumber), active: b.active === true,
        },
        instructions: p.instructions || '',
    };
}

function errorsOf(p: Payment): Record<string, string> {
    const e: Record<string, string> = {};
    for (const { key, label, pattern, format } of MOBILE_METHODS) {
        const n = p[key].number.replace(/[\s-]/g, '');
        if (n && !pattern.test(n)) e[`${key}.number`] = `Enter the ${label} number as ${format}`;
        else if (p[key].active && !n) e[`${key}.number`] = `Add the ${label} number before showing it at checkout`;
    }
    if (p.bank.active) {
        if (!p.bank.bankName.trim()) e['bank.bankName'] = 'Required to show bank transfer';
        if (!p.bank.accountName.trim()) e['bank.accountName'] = 'Required to show bank transfer';
        if (!p.bank.accountNumber.trim()) e['bank.accountNumber'] = 'Required to show bank transfer';
    }
    return e;
}

/**
 * Settings → Payment methods (super admin only). Cash on delivery is always offered;
 * bKash, Nagad, Rocket and bank transfer are shown at checkout only while switched on here.
 */
export default function PaymentSettings() {
    const { data, isLoading, isError, refetch } = useGetSiteContentQuery({});
    if (isLoading) return <CardSkeleton lines={4} />;
    if (isError || !data?.data) {
        return (
            <Card title="Couldn't load payment methods" description="The payment settings could not be fetched from the server.">
                <Btn onClick={() => refetch()}>Try again</Btn>
            </Card>
        );
    }
    const saved = fromServer(data.data.payment);
    // Keyed on the saved values, so a save (here or in another tab) resets the draft.
    return <PaymentCard key={JSON.stringify(saved)} saved={saved} />;
}

function PaymentCard({ saved }: { saved: Payment }) {
    const [save, { isLoading: saving }] = useUpdatePaymentSettingsMutation();
    const [draft, setDraft] = useState<Payment>(saved);

    const errors = errorsOf(draft);
    const hasError = Object.keys(errors).length > 0;
    const changed = JSON.stringify(draft) !== JSON.stringify(saved);

    const setMobile = (key: MobileKey, patch: Partial<Mobile>) =>
        setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
    const setBank = (patch: Partial<Bank>) => setDraft((d) => ({ ...d, bank: { ...d.bank, ...patch } }));
    const cleanMobile = (m: Mobile): Mobile => ({ ...m, number: m.number.replace(/[\s-]/g, '') });
    const rocketChanged = JSON.stringify(draft.rocket) !== JSON.stringify(saved.rocket);

    const onSave = async () => {
        try {
            await save({
                bkash: cleanMobile(draft.bkash),
                nagad: cleanMobile(draft.nagad),
                // Rocket is sent only when it was changed, so saving bKash / Nagad / bank
                // keeps working against a server that does not know Rocket yet.
                ...(rocketChanged ? { rocket: cleanMobile(draft.rocket) } : {}),
                bank: draft.bank,
                instructions: draft.instructions,
            }).unwrap();
            toast.success('Payment methods saved');
        } catch (err) {
            toast.error(apiError(err, 'Could not save the payment methods'));
        }
    };

    const shown = [
        'Cash on delivery',
        draft.bkash.active && 'bKash',
        draft.nagad.active && 'Nagad',
        draft.rocket.active && 'Rocket',
        draft.bank.active && 'Bank transfer',
    ].filter(Boolean).join(', ');

    return (
        <Card
            title="Payment methods at checkout"
            description={`Customers can pay with: ${shown}.`}
        >
            <Note>
                Cash on delivery is always offered. Switch a method on to show it at checkout too: the customer
                pays to the account below, then enters where they paid from, the transaction ID and the time.
                Those appear on the order, so check them against your statement before marking it paid.
            </Note>

            <div className="mt-5 space-y-4">
                {MOBILE_METHODS.map(({ key, label, color }) => {
                    const m = draft[key];
                    return (
                        <MethodBlock key={key} title={label} color={color}
                            active={m.active} onActive={(v) => setMobile(key, { active: v })}>
                            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                                <Field label={`${label} number`} error={errors[`${key}.number`]}>
                                    <input className={INPUT} inputMode="tel" placeholder="01XXXXXXXXX" value={m.number}
                                        onChange={(e) => setMobile(key, { number: e.target.value })} />
                                </Field>
                                <Field label="Account type">
                                    <select className={INPUT} value={m.accountType} onChange={(e) => setMobile(key, { accountType: e.target.value })}>
                                        <option value="Personal">Personal</option>
                                        <option value="Agent">Agent</option>
                                        <option value="Merchant">Merchant</option>
                                    </select>
                                </Field>
                            </div>
                        </MethodBlock>
                    );
                })}

                <MethodBlock title="Bank transfer" color="#0F766E" active={draft.bank.active} onActive={(v) => setBank({ active: v })}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Bank name" error={errors['bank.bankName']}>
                            <input className={INPUT} placeholder="e.g. Dutch-Bangla Bank" value={draft.bank.bankName}
                                onChange={(e) => setBank({ bankName: e.target.value })} />
                        </Field>
                        <Field label="Account name" error={errors['bank.accountName']}>
                            <input className={INPUT} placeholder="Name on the account" value={draft.bank.accountName}
                                onChange={(e) => setBank({ accountName: e.target.value })} />
                        </Field>
                        <Field label="Account number" error={errors['bank.accountNumber']}>
                            <input className={INPUT} value={draft.bank.accountNumber}
                                onChange={(e) => setBank({ accountNumber: e.target.value })} />
                        </Field>
                        <Field label="Branch" hint="Optional">
                            <input className={INPUT} value={draft.bank.branch}
                                onChange={(e) => setBank({ branch: e.target.value })} />
                        </Field>
                        <Field label="Routing number" hint="Optional">
                            <input className={INPUT} inputMode="numeric" value={draft.bank.routingNumber}
                                onChange={(e) => setBank({ routingNumber: e.target.value })} />
                        </Field>
                    </div>
                </MethodBlock>

                <Field label="Instructions for the customer" hint="Shown under the account at checkout. Optional.">
                    <textarea className={TEXTAREA} rows={2} maxLength={300} value={draft.instructions}
                        placeholder="e.g. Send Money to the number above, then enter your number, the transaction ID and the time."
                        onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} />
                </Field>
            </div>

            <SaveRow
                canSave={changed && !hasError}
                dirty={changed}
                saving={saving}
                onSave={onSave}
                onDiscard={() => setDraft(saved)}
            />
        </Card>
    );
}

function MethodBlock({ title, color, active, onActive, children }: {
    title: string; color: string; active: boolean; onActive: (v: boolean) => void; children: React.ReactNode;
}) {
    return (
        <div className={cx('rounded-xl border p-4', active ? 'border-gray-200' : 'border-dashed border-gray-200 bg-gray-50/50')}>
            <Toggle
                checked={active}
                onChange={onActive}
                label={
                    <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        <span className="font-medium text-gray-900">{title}</span>
                        <span className="text-xs text-gray-400">{active ? 'Shown at checkout' : 'Hidden'}</span>
                    </span>
                }
            />
            <div className="mt-3">{children}</div>
        </div>
    );
}

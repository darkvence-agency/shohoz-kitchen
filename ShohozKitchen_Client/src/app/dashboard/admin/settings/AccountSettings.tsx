"use client";

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { LuCircleAlert, LuCircleCheck, LuKeyRound } from 'react-icons/lu';
import { useUpdatePasswordMutation } from '@/redux/api/authApi';
import { useGetShippingSettingsQuery } from '@/redux/api/shippingApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { Btn, Card, Field, INPUT, fmtDateTime } from '@/components/admin/ui';
import { apiError } from './helpers';

const EMPTY_PW = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Settings → Account: change your own password, plus a small system status panel. */
export default function AccountSettings() {
    return (
        <div className="grid items-start gap-5 lg:grid-cols-2">
            <PasswordCard />
            <SystemCard />
        </div>
    );
}

function PasswordCard() {
    const [updatePassword, { isLoading }] = useUpdatePasswordMutation();
    const [pw, setPw] = useState(EMPTY_PW);
    const set = (k: keyof typeof EMPTY_PW) => (e: React.ChangeEvent<HTMLInputElement>) => setPw((p) => ({ ...p, [k]: e.target.value }));

    const tooShort = pw.newPassword.length > 0 && pw.newPassword.length < 6;
    const mismatch = pw.confirmPassword.length > 0 && pw.newPassword !== pw.confirmPassword;
    const ready = !!pw.currentPassword && pw.newPassword.length >= 6 && pw.newPassword === pw.confirmPassword;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pw.currentPassword || !pw.newPassword) { toast.error('Please fill in all password fields'); return; }
        if (pw.newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
        if (pw.newPassword !== pw.confirmPassword) { toast.error('New passwords do not match'); return; }
        try {
            await updatePassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword }).unwrap();
            toast.success('Password changed');
            setPw(EMPTY_PW);
        } catch (err) {
            toast.error(apiError(err, 'Failed to change password'));
        }
    };

    return (
        <Card title="Account security" description="Change the password for your own admin account.">
            <form onSubmit={submit} className="space-y-4">
                <Field label="Current password">
                    <input type="password" autoComplete="current-password" className={INPUT} value={pw.currentPassword} onChange={set('currentPassword')} />
                </Field>
                <Field label="New password" error={tooShort ? 'At least 6 characters' : undefined} hint="At least 6 characters">
                    <input type="password" autoComplete="new-password" className={INPUT} value={pw.newPassword} onChange={set('newPassword')} />
                </Field>
                <Field label="Confirm new password" error={mismatch ? 'Passwords do not match' : undefined}>
                    <input type="password" autoComplete="new-password" className={INPUT} value={pw.confirmPassword} onChange={set('confirmPassword')} />
                </Field>
                <Btn type="submit" variant="primary" icon={<LuKeyRound size={15} />} disabled={!ready || isLoading}>
                    {isLoading ? 'Changing…' : 'Change password'}
                </Btn>
            </form>
        </Card>
    );
}

function SystemCard() {
    // Reuse the page's own queries (already cached) to report whether the API answers.
    const shipping = useGetShippingSettingsQuery();
    const site = useGetSiteContentQuery({});
    const loading = shipping.isLoading || site.isLoading;
    const apiOk = !shipping.isError && !site.isError;

    const rows: { label: string; value: React.ReactNode }[] = [
        { label: 'App version', value: 'v1.0.0' },
        { label: 'Framework', value: 'Next.js 16' },
        {
            label: 'API status',
            value: loading ? <span className="text-gray-400">Checking…</span>
                : apiOk ? <span className="inline-flex items-center gap-1 text-emerald-600"><LuCircleCheck size={14} /> Connected</span>
                    : <span className="inline-flex items-center gap-1 text-red-600"><LuCircleAlert size={14} /> Not reachable</span>,
        },
        { label: 'Database', value: 'MongoDB Atlas' },
        { label: 'Delivery settings last changed', value: fmtDateTime(shipping.data?.updatedAt) },
    ];

    return (
        <Card title="System information" description="Current system status.">
            <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm">
                        <dt className="text-gray-500">{r.label}</dt>
                        <dd className="text-right font-medium text-gray-800">{r.value}</dd>
                    </div>
                ))}
            </dl>
        </Card>
    );
}

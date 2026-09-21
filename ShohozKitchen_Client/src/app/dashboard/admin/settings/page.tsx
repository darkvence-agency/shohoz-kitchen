"use client";

import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/redux/store';
import { PageHeader } from '@/components/admin/ui';
import { SettingsSection } from './parts';
import BusinessSettings from './BusinessSettings';
import StoreSettings from './StoreSettings';
import AccountSettings from './AccountSettings';
import PaymentSettings from './PaymentSettings';

/**
 * Settings — business numbers first (courier COD charge, delivery charge), then the
 * payment methods offered at checkout (super admin only), then the store's brand /
 * identity / SEO, then the signed-in admin's own account.
 * Every card saves on its own, so changing one never re-saves another.
 */
export default function SettingsPage() {
    const isSuperadmin = useSelector((s: RootState) => s.auth.user?.role) === 'superadmin';

    return (
        <div className="max-w-5xl">
            <PageHeader
                title="Settings"
                subtitle="Business numbers you can change without a deploy, plus your store's brand and your account."
            />

            <div className="space-y-9">
                <SettingsSection
                    id="business"
                    title="Business"
                    description="Charges used on new orders and newly booked parcels, as soon as you save."
                >
                    <BusinessSettings />
                </SettingsSection>

                {isSuperadmin && (
                    <SettingsSection
                        id="payments"
                        title="Payment methods"
                        description="What customers can pay with at checkout. Only the super admin can change this."
                    >
                        <PaymentSettings />
                    </SettingsSection>
                )}

                <SettingsSection id="store" title="Store" description="Your logo and store details.">
                    <StoreSettings />
                </SettingsSection>

                <SettingsSection id="account" title="Account">
                    <AccountSettings />
                </SettingsSection>
            </div>
        </div>
    );
}

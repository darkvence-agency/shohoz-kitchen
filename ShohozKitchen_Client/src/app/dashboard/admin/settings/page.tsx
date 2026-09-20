"use client";

import React from 'react';
import { PageHeader } from '@/components/admin/ui';
import { SettingsSection } from './parts';
import BusinessSettings from './BusinessSettings';
import StoreSettings from './StoreSettings';
import AccountSettings from './AccountSettings';

/**
 * Settings — business numbers first (courier COD charge, delivery charge), then the
 * store's brand / identity / SEO, then the signed-in admin's own account.
 * Every card saves on its own, so changing one never re-saves another.
 */
export default function SettingsPage() {
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

                <SettingsSection id="store" title="Store" description="How your storefront looks and appears in search.">
                    <StoreSettings />
                </SettingsSection>

                <SettingsSection id="account" title="Account">
                    <AccountSettings />
                </SettingsSection>
            </div>
        </div>
    );
}

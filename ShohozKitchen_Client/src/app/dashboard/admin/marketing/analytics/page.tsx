"use client";

import { PageHeader } from '@/components/admin/ui';
import MarketingForm, { HowTo, Note, upper } from '@/components/admin/marketing/MarketingForm';
import { MARKETING_PATTERNS } from '@/lib/marketing';

export default function AnalyticsSettingsPage() {
    return (
        <div>
            <PageHeader
                title="Google Analytics"
                subtitle="Visitors, where they come from, and what they buy — Google Analytics 4."
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <MarketingForm
                        group="marketing"
                        title="GA4 property"
                        description="Leave empty to switch Google Analytics off (or if it is set up inside Tag Manager)."
                        fields={[{
                            key: 'ga4Id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX', mono: true,
                            pattern: MARKETING_PATTERNS.ga4Id, message: 'A measurement ID looks like G-XXXXXXXXXX', normalize: upper,
                            hint: 'Page views, product views, add to cart, checkout and purchases (with order value in BDT) are sent automatically.',
                        }]}
                    />
                </div>
                <div className="space-y-6">
                    <HowTo steps={[
                        <>Open <b>analytics.google.com</b> and go to <b>Admin</b> (the gear, bottom left).</>,
                        <>Under the property, open <b>Data streams</b> and pick the web stream (create one for the site if there is none).</>,
                        <>Copy the <b>Measurement ID</b> at the top right — it starts with <code>G-</code>.</>,
                        <>Paste it here and save. Visits show in <b>Reports → Realtime</b> within a minute or two.</>,
                    ]} />
                    <Note>
                        Already added GA4 as a tag inside <b>Google Tag Manager</b>? Then leave this empty —
                        using both counts every visit twice.
                    </Note>
                </div>
            </div>
        </div>
    );
}

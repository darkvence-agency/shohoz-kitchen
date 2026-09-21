"use client";

import { PageHeader, Card } from '@/components/admin/ui';
import MarketingForm, { HowTo, Note, upper } from '@/components/admin/marketing/MarketingForm';
import { MARKETING_PATTERNS } from '@/lib/marketing';

// What the storefront pushes to the data layer — the names a marketer builds GTM
// triggers on. Kept in step with src/lib/marketing.ts.
const EVENTS: [string, string][] = [
    ['page_view', 'Every page change after the first (the first is GTM’s own "Container Loaded")'],
    ['view_item', 'A product page is opened'],
    ['add_to_cart', 'Anything is added to the cart, from any button'],
    ['begin_checkout', 'The checkout page is opened'],
    ['purchase', 'An order is placed — with transaction_id, value and currency BDT'],
];

export default function TagManagerPage() {
    return (
        <div>
            <PageHeader
                title="Google Tag Manager"
                subtitle="One container that loads every other tag — GA4, Meta, TikTok, Google Ads — without touching the site's code."
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <MarketingForm
                        group="marketing"
                        title="Container"
                        description="Leave empty to switch Tag Manager off."
                        fields={[{
                            key: 'gtmId', label: 'Container ID', placeholder: 'GTM-XXXXXXX', mono: true,
                            pattern: MARKETING_PATTERNS.gtmId, message: 'A container ID looks like GTM-XXXXXXX', normalize: upper,
                        }]}
                    />
                    <Card title="Events the site sends" description="Use these as Custom Event triggers in GTM. Ecommerce events carry GA4-style ecommerce data.">
                        <ul className="divide-y divide-gray-100 text-sm">
                            {EVENTS.map(([name, when]) => (
                                <li key={name} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
                                    <code className="w-36 shrink-0 font-mono text-gray-900">{name}</code>
                                    <span className="text-gray-600">{when}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
                <div className="space-y-6">
                    <HowTo steps={[
                        <>Open <b>tagmanager.google.com</b> and sign in.</>,
                        <>Create an account and a container; choose <b>Web</b> as the platform.</>,
                        <>The container ID is at the top of the workspace, next to the container name.</>,
                        <>Paste it here and save. GTM loads on the site within a minute.</>,
                        <>In GTM, press <b>Submit → Publish</b> after every change, or nothing goes live.</>,
                    ]} />
                    <Note>
                        If GA4 or a pixel is set up <b>inside GTM</b>, leave its own box on the other Digital
                        marketing pages empty — otherwise every visit and sale is counted twice.
                    </Note>
                </div>
            </div>
        </div>
    );
}

"use client";

import { PageHeader } from '@/components/admin/ui';
import MarketingForm, { HowTo, Note } from '@/components/admin/marketing/MarketingForm';

export default function SeoPage() {
    return (
        <div>
            <PageHeader
                title="SEO"
                subtitle="How the shop appears in Google results and when a link is shared on Facebook or WhatsApp."
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <MarketingForm
                        group="seo"
                        showStatus={false}
                        title="Home page"
                        description="The home page uses these as they are; other pages show their own name followed by “| Shohoz Kitchen”."
                        fields={[
                            {
                                key: 'title', label: 'Title', required: true, maxLength: 60,
                                placeholder: 'Shohoz Kitchen — Kitchenware online in Bangladesh',
                                hint: 'The blue link in Google results. Around 50–60 characters shows in full.',
                            },
                            {
                                key: 'description', label: 'Description', multiline: true, maxLength: 160,
                                placeholder: 'Cookware, dinnerware and kitchen tools, delivered across Bangladesh…',
                                hint: 'The two lines under the link. Around 150–160 characters shows in full.',
                            },
                            {
                                key: 'keywords', label: 'Keywords', maxLength: 250,
                                placeholder: 'kitchenware, cookware bangladesh, non-stick pan, …',
                                hint: 'Comma-separated. Google ignores these for ranking; some other engines still read them.',
                            },
                        ]}
                    />
                </div>
                <div className="space-y-6">
                    <HowTo title="Writing them well" steps={[
                        <>Put what you sell and where first: “Kitchenware in Bangladesh” beats “Welcome to our shop”.</>,
                        <>Write the description for a person deciding whether to click — mention delivery, cash on delivery, or what makes the shop different.</>,
                        <>Each product page already uses the product’s own name and description; nothing to do there.</>,
                    ]} />
                    <Note>
                        Google re-reads the site on its own schedule — a change here is live on the site within a
                        minute, but can take days to show in search results.
                    </Note>
                </div>
            </div>
        </div>
    );
}

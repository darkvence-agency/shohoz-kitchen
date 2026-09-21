"use client";

import { PageHeader } from '@/components/admin/ui';
import MarketingForm, { HowTo, Note, metaContent, upper } from '@/components/admin/marketing/MarketingForm';
import { MARKETING_PATTERNS } from '@/lib/marketing';

export default function PixelsPage() {
    return (
        <div>
            <PageHeader
                title="Pixels"
                subtitle="Meta (Facebook & Instagram) and TikTok ad tracking — which ads lead to sales."
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <MarketingForm
                        group="marketing"
                        title="Meta Pixel"
                        description="Sends PageView, ViewContent, AddToCart, InitiateCheckout and Purchase (with value in BDT)."
                        fields={[
                            {
                                key: 'metaPixelId', label: 'Pixel ID', placeholder: '123456789012345', mono: true,
                                pattern: MARKETING_PATTERNS.metaPixelId, message: 'A Pixel ID is 8–20 digits',
                            },
                            {
                                key: 'metaDomainVerification', label: 'Domain verification code', mono: true,
                                placeholder: 'abc123def456… — or paste the whole <meta> tag',
                                pattern: MARKETING_PATTERNS.metaDomainVerification, message: 'Paste the code from Meta, or the whole meta tag',
                                normalize: metaContent,
                                hint: 'Meta asks for this before ads can optimise for purchases on your domain.',
                            },
                        ]}
                    />
                    <MarketingForm
                        group="marketing"
                        title="TikTok Pixel"
                        description="Sends page views, ViewContent, AddToCart, InitiateCheckout and CompletePayment."
                        fields={[{
                            key: 'tiktokPixelId', label: 'Pixel ID', placeholder: 'C1234567890ABCDEFGHI', mono: true,
                            pattern: MARKETING_PATTERNS.tiktokPixelId, message: 'A TikTok Pixel ID is capital letters and digits', normalize: upper,
                        }]}
                    />
                </div>
                <div className="space-y-6">
                    <HowTo title="Meta Pixel ID" steps={[
                        <>Open <b>business.facebook.com</b> → <b>Events Manager</b>.</>,
                        <>Pick your dataset (pixel) on the left, or connect a new <b>Web</b> one.</>,
                        <>The Pixel ID is under its name. Copy it here.</>,
                        <>For domain verification: <b>Business settings → Brand safety → Domains</b> → add the domain → <b>Meta-tag verification</b>, and paste that tag above.</>,
                    ]} />
                    <HowTo title="TikTok Pixel ID" steps={[
                        <>Open <b>ads.tiktok.com</b> → <b>Tools → Events</b>.</>,
                        <>Choose <b>Web Events</b> and create or open a pixel (set it up manually).</>,
                        <>Copy the Pixel ID shown under the pixel’s name.</>,
                    ]} />
                    <Note>
                        Pixels already added inside <b>Google Tag Manager</b>? Leave their boxes here empty,
                        or every sale is reported to the ad platform twice.
                    </Note>
                </div>
            </div>
        </div>
    );
}

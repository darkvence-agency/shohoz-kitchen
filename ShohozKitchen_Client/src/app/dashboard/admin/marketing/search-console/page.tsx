"use client";

import { useSyncExternalStore } from 'react';
import toast from 'react-hot-toast';
import { LuCopy } from 'react-icons/lu';
import { PageHeader, Card, Btn } from '@/components/admin/ui';
import MarketingForm, { HowTo, Note, metaContent } from '@/components/admin/marketing/MarketingForm';
import { MARKETING_PATTERNS } from '@/lib/marketing';

export default function SearchConsolePage() {
    // The address the shop is open on right now — the sslip.io one today, the real
    // domain once it is connected. The sitemap is served from the storefront.
    // Empty on the server, the real origin in the browser, without a hydration mismatch.
    const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => '');
    const sitemap = origin ? `${origin}/sitemap.xml` : '';

    const copy = async () => {
        try { await navigator.clipboard.writeText(sitemap); toast.success('Sitemap address copied'); }
        catch { toast.error('Could not copy — select it and copy by hand'); }
    };

    return (
        <div>
            <PageHeader
                title="Search Console"
                subtitle="Prove to Google and Bing that the site is yours, so they index it and show you how it ranks."
            />
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <MarketingForm
                        group="marketing"
                        title="Site verification"
                        description="Added to every page's HTML as a meta tag. Keep it here after verifying — removing it un-verifies the site."
                        fields={[
                            {
                                key: 'googleVerification', label: 'Google Search Console', mono: true,
                                placeholder: 'abc123… — or paste the whole <meta> tag',
                                pattern: MARKETING_PATTERNS.googleVerification, message: 'Paste the code from Search Console, or the whole meta tag',
                                normalize: metaContent,
                            },
                            {
                                key: 'bingVerification', label: 'Bing Webmaster Tools (optional)', mono: true,
                                placeholder: '0123456789ABCDEF… — or paste the whole <meta> tag',
                                pattern: MARKETING_PATTERNS.bingVerification, message: 'Paste the code from Bing, or the whole meta tag',
                                normalize: metaContent,
                            },
                        ]}
                    />
                    <Card title="Sitemap" description="Submit this in Search Console → Sitemaps once the site is verified. It lists every product and category and updates itself.">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <code className="min-w-0 flex-1 truncate rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm text-gray-800">
                                {sitemap || '…'}
                            </code>
                            <Btn icon={<LuCopy size={15} />} onClick={copy} disabled={!sitemap}>Copy</Btn>
                        </div>
                    </Card>
                </div>
                <div className="space-y-6">
                    <HowTo title="Google" steps={[
                        <>Open <b>search.google.com/search-console</b> → <b>Add property</b> → <b>URL prefix</b>, and enter the site address.</>,
                        <>Under <b>Other verification methods</b>, choose <b>HTML tag</b> and copy it.</>,
                        <>Paste it above — the whole tag is fine — and save.</>,
                        <>Wait a minute for the site to pick it up, then press <b>Verify</b> in Search Console.</>,
                    ]} />
                    <HowTo title="Bing" steps={[
                        <>Open <b>bing.com/webmasters</b> — it can import straight from Google Search Console, with no code at all.</>,
                        <>Or add the site by hand, choose the <b>Meta tag</b> option, paste it above and save.</>,
                    ]} />
                    <Note>
                        Verify the address people will actually use. Once <b>shohozkitchen.com</b> is connected,
                        add it as its own property — the temporary address is a different site to Google.
                    </Note>
                </div>
            </div>
        </div>
    );
}

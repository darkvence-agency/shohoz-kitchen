import { z } from 'zod';

/**
 * Shapes for the Digital marketing and SEO settings.
 *
 * Tracking IDs are interpolated into <script> tags on every storefront page, so each
 * one must match a strict pattern: letters, digits and a fixed prefix, nothing that
 * could close a string or a tag. The client mirrors these patterns
 * (ShohozKitchen_Client/src/lib/marketing.ts) and refuses to render anything else.
 */
export const MARKETING_PATTERNS = {
    gtmId: /^GTM-[A-Z0-9]{4,12}$/,
    ga4Id: /^G-[A-Z0-9]{4,15}$/,
    metaPixelId: /^\d{8,20}$/,
    tiktokPixelId: /^[A-Z0-9]{10,32}$/,
    // Verification codes: Google's use letters, digits, '-' and '_'; Bing's are hex.
    googleVerification: /^[A-Za-z0-9_-]{8,120}$/,
    bingVerification: /^[A-Za-z0-9_-]{8,120}$/,
    metaDomainVerification: /^[A-Za-z0-9_-]{8,120}$/,
} as const;

/**
 * People paste the whole tag Google hands them —
 * <meta name="google-site-verification" content="abc123" /> — so keep just the content.
 */
const verificationCode = (v: unknown) => {
    if (typeof v !== 'string') return v;
    const s = v.trim();
    const m = s.match(/content\s*=\s*["']([^"']+)["']/i);
    return m ? m[1].trim() : s;
};

const id = (pattern: RegExp, message: string, clean: (v: unknown) => unknown = (v) => (typeof v === 'string' ? v.trim() : v)) =>
    z.preprocess(clean, z.union([z.literal(''), z.string().regex(pattern, message)])).optional();

export const updateMarketingValidation = z.object({
    body: z
        .object({
            gtmId: id(MARKETING_PATTERNS.gtmId, 'A Tag Manager ID looks like GTM-XXXXXXX', (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v)),
            ga4Id: id(MARKETING_PATTERNS.ga4Id, 'A GA4 measurement ID looks like G-XXXXXXXXXX', (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v)),
            metaPixelId: id(MARKETING_PATTERNS.metaPixelId, 'A Meta Pixel ID is 8–20 digits'),
            tiktokPixelId: id(MARKETING_PATTERNS.tiktokPixelId, 'A TikTok Pixel ID is capital letters and digits', (v) => (typeof v === 'string' ? v.trim().toUpperCase() : v)),
            googleVerification: id(MARKETING_PATTERNS.googleVerification, 'Paste the code from Search Console (or the whole meta tag)', verificationCode),
            bingVerification: id(MARKETING_PATTERNS.bingVerification, 'Paste the code from Bing (or the whole meta tag)', verificationCode),
            metaDomainVerification: id(MARKETING_PATTERNS.metaDomainVerification, 'Paste the code from Meta (or the whole meta tag)', verificationCode),
        })
        .strict(),
});

export const updateSeoValidation = z.object({
    body: z
        .object({
            title: z.string().trim().min(1, 'The site title cannot be empty').max(120, 'Keep the title under 120 characters').optional(),
            description: z.string().trim().max(320, 'Keep the description under 320 characters').optional(),
            keywords: z.string().trim().max(500, 'Keep the keywords under 500 characters').optional(),
        })
        .strict(),
});

// ── Checkout payment accounts (Settings → Payment methods) ──
// Switching a method on needs its account set, so checkout never shows an empty number.
const MOBILE_NUMBER = /^01\d{9}$/;
// A Rocket account number is the 11-digit mobile number plus one check digit.
// Some shops still enter the bare mobile number, so accept either length.
const ROCKET_NUMBER = /^01\d{9,10}$/;
const text = (max: number, label: string) => z.string().trim().max(max, `${label} is too long`).optional();

const mobileAccount = (label: string, pattern = MOBILE_NUMBER, shape = '01XXXXXXXXX') =>
    z
        .object({
            number: z
                .preprocess((v) => (typeof v === 'string' ? v.replace(/[\s-]/g, '') : v), z.union([z.literal(''), z.string().regex(pattern, `Enter the ${label} number as ${shape}`)]))
                .optional(),
            accountType: z.enum(['Personal', 'Agent', 'Merchant']).optional(),
            active: z.boolean().optional(),
        })
        .strict()
        .refine((m) => !(m.active && !m.number), { message: `Add the ${label} number before showing it at checkout`, path: ['number'] });

export const updatePaymentValidation = z.object({
    body: z
        .object({
            bkash: mobileAccount('bKash').optional(),
            nagad: mobileAccount('Nagad').optional(),
            rocket: mobileAccount('Rocket', ROCKET_NUMBER, '01XXXXXXXXXX (12 digits)').optional(),
            bank: z
                .object({
                    bankName: text(80, 'Bank name'),
                    accountName: text(80, 'Account name'),
                    accountNumber: text(40, 'Account number'),
                    branch: text(80, 'Branch'),
                    routingNumber: text(20, 'Routing number'),
                    active: z.boolean().optional(),
                })
                .strict()
                .refine((b) => !(b.active && (!b.bankName || !b.accountName || !b.accountNumber)), {
                    message: 'Add the bank name, account name and account number before showing it at checkout',
                    path: ['accountNumber'],
                })
                .optional(),
            instructions: text(300, 'The instructions'),
        })
        .strict(),
});

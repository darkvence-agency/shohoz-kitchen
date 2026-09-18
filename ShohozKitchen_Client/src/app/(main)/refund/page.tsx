import type { Metadata } from 'next';
import { FiRefreshCw } from 'react-icons/fi';
import LegalPageLayout from '@/components/shared/LegalPageLayout';

export const metadata: Metadata = {
    title: "Refund & Return Policy",
    description: "Understand Shohoz Kitchen's refund and return policy — how to request a refund, eligibility, and timelines for orders in Bangladesh.",
    alternates: { canonical: "/refund" },
};

export default function RefundPage() {
    return (
        <LegalPageLayout
            slug="refund"
            fallbackTitle="Refund Policy"
            icon={<FiRefreshCw size={24} />}
            accentColor="var(--color-primary)"
            ctaTitle="Need a refund or return?"
            ctaDescription="Contact our support team and we'll help resolve your issue."
            ctaButtonText="Contact Support"
        />
    );
}

import type { Metadata } from 'next';
import { FiFileText } from 'react-icons/fi';
import LegalPageLayout from '@/components/shared/LegalPageLayout';

export const metadata: Metadata = {
    title: "Terms & Conditions",
    description: "Read the Terms & Conditions for using Shohoz Kitchen's online marketplace and shopping services in Bangladesh.",
    alternates: { canonical: "/terms" },
};

export default function TermsPage() {
    return (
        <LegalPageLayout
            slug="terms"
            fallbackTitle="Terms & Conditions"
            icon={<FiFileText size={24} />}
            accentColor="var(--color-primary)"
            ctaTitle="Have questions about these terms?"
            ctaDescription="Our team is happy to help clarify anything."
            ctaButtonText="Contact Us"
        />
    );
}

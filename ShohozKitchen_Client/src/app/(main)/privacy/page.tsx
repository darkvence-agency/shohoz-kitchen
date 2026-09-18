import type { Metadata } from 'next';
import { FiShield } from 'react-icons/fi';
import LegalPageLayout from '@/components/shared/LegalPageLayout';

export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Learn how Shohoz Kitchen collects, uses, and protects your personal data when you use our online marketplace.",
    alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
    return (
        <LegalPageLayout
            slug="privacy"
            fallbackTitle="Privacy Policy"
            icon={<FiShield size={24} />}
            accentColor="var(--color-primary)"
            ctaTitle="Privacy concerns?"
            ctaDescription="Contact our team if you have questions about your data."
            ctaButtonText="Contact Us"
        />
    );
}

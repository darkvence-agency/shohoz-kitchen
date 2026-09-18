"use client";

import React from 'react';
import Link from 'next/link';
import { FiChevronLeft, FiMail, FiCalendar } from 'react-icons/fi';
import { useGetLegalPageQuery } from '@/redux/api/siteContentApi';

interface LegalPageProps {
    slug: string;
    fallbackTitle: string;
    icon: React.ReactNode;
    accentColor: string;
    ctaTitle: string;
    ctaDescription: string;
    ctaButtonText: string;
}

const LegalPageLayout = ({ slug, fallbackTitle, icon, accentColor, ctaTitle, ctaDescription, ctaButtonText }: LegalPageProps) => {
    const { data: response, isLoading } = useGetLegalPageQuery(slug);
    const page = response?.data;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-[3px] border-gray-100 border-t-[var(--color-primary)] rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-gray-400 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    const lastUpdated = page?.lastUpdated
        ? new Date(page.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null;

    return (
        <div className="bg-[#fafbfc] min-h-screen">
            {/* ══ HERO HEADER ══ */}
            <div style={{ background: 'linear-gradient(180deg, #fff 0%, #f8f9fb 100%)', borderBottom: '1px solid #eef0f3' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 24px 44px', textAlign: 'center' }}>
                    {/* Breadcrumb */}
                    <Link
                        href="/"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '24px' }}
                    >
                        <FiChevronLeft size={12} />
                        Back to Home
                    </Link>

                    {/* Icon Badge */}
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${accentColor}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: accentColor }}>
                        {icon}
                    </div>

                    {/* Title */}
                    <h1 style={{ fontSize: '28px', fontWeight: 900, color: '#111', letterSpacing: '-0.5px', margin: '0 0 8px', lineHeight: 1.2 }}>
                        {page?.title || fallbackTitle}
                    </h1>

                    {/* Last Updated */}
                    {lastUpdated && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9ca3af', fontWeight: 500, background: '#f3f4f6', padding: '4px 12px', borderRadius: '20px', marginTop: '4px' }}>
                            <FiCalendar size={11} />
                            Last updated: {lastUpdated}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ CONTENT ══ */}
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 24px 60px' }}>
                <div
                    style={{ background: '#fff', borderRadius: '14px', border: '1px solid #eef0f3', padding: '36px 40px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
                >
                    <div
                        className="legal-content"
                        dangerouslySetInnerHTML={{ __html: page?.content || '<p>Content coming soon.</p>' }}
                    />
                </div>

                {/* ══ CONTACT CTA ══ */}
                <div style={{ marginTop: '32px', textAlign: 'center', padding: '28px 24px', background: '#fff', borderRadius: '14px', border: '1px solid #eef0f3' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#111', margin: '0 0 4px' }}>{ctaTitle}</h3>
                    <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>{ctaDescription}</p>
                    <Link
                        href="/contact"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '10px 28px', background: 'var(--color-primary)', color: '#fff',
                            borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                            textDecoration: 'none', letterSpacing: '0.3px',
                            transition: 'all 0.2s',
                        }}
                    >
                        <FiMail size={13} />
                        {ctaButtonText}
                    </Link>
                </div>
            </div>

            <style>{`
                .legal-content h1 { font-size: 22px; font-weight: 800; color: #111; margin: 28px 0 12px; letter-spacing: -0.3px; }
                .legal-content h2 { font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 28px 0 10px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
                .legal-content h3 { font-size: 15px; font-weight: 600; color: #333; margin: 20px 0 8px; }
                .legal-content p { font-size: 14px; line-height: 1.9; color: #555; margin-bottom: 14px; }
                .legal-content ul, .legal-content ol { padding-left: 20px; margin-bottom: 14px; }
                .legal-content li { font-size: 14px; line-height: 1.9; color: #555; margin-bottom: 6px; }
                .legal-content li::marker { color: var(--color-primary); }
                .legal-content blockquote { border-left: 3px solid var(--color-primary); padding: 12px 18px; background: var(--color-primary-surface); margin: 18px 0; border-radius: 0 8px 8px 0; font-style: italic; color: #444; }
                .legal-content a { color: var(--color-primary); font-weight: 600; text-decoration: underline; text-decoration-color: var(--color-primary)40; text-underline-offset: 2px; }
                .legal-content a:hover { text-decoration-color: var(--color-primary); }
                .legal-content strong { color: #222; font-weight: 700; }
                .legal-content hr { border: none; border-top: 1px solid #eee; margin: 28px 0; }
                .legal-content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
                .legal-content th, .legal-content td { padding: 10px 14px; border: 1px solid #eee; text-align: left; }
                .legal-content th { background: #f8f9fa; font-weight: 700; color: #333; }
                @media (max-width: 640px) {
                    .legal-content h1 { font-size: 19px; }
                    .legal-content h2 { font-size: 16px; }
                }
            `}</style>
        </div>
    );
};

export default LegalPageLayout;

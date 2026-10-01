/* eslint-disable @next/next/no-img-element */
"use client";

/**
 * The shop's logo as set in Settings → Store, for every place the brand is drawn.
 *
 * Logo.tsx is the built-in artwork. These wrap it: when the shop has uploaded its own
 * logo or browser-tab icon they show that instead, and fall back to the built-in one
 * until then (or while the settings are still loading).
 */

import React from 'react';
import Logo, { LogoMark } from '@/components/shared/Logo';
import { useTheme } from '@/components/shared/ThemeProvider';

/** ThemeProvider's stand-in when nothing is uploaded. */
const BUILT_IN_LOGO = '/logo.svg';

const uploadedLogo = (url: string) => (url && url !== BUILT_IN_LOGO ? url : '');

/** The full logo, `size` px tall. */
export function SiteLogo({ size = 40, className }: { size?: number; className?: string }) {
    const logo = uploadedLogo(useTheme().logoUrl);
    if (!logo) return <Logo size={size} className={className} />;
    return (
        <img
            src={logo}
            alt="Shohoz Kitchen"
            style={{ height: size, width: 'auto', maxWidth: size * 4 }}
            className={['block object-contain', className].filter(Boolean).join(' ')}
        />
    );
}

/**
 * The square brand mark, for tight spots such as the dashboard sidebar. The uploaded
 * browser-tab icon is square by design, so it is the first choice; then the uploaded
 * logo, fitted into the square; then the built-in disc.
 */
export function SiteMark({ size = 36, className }: { size?: number; className?: string }) {
    const { faviconUrl, logoUrl } = useTheme();
    const src = faviconUrl || uploadedLogo(logoUrl);
    if (!src) return <LogoMark size={size} className={className} />;
    return (
        <img
            src={src}
            alt="Shohoz Kitchen"
            width={size}
            height={size}
            style={{ width: size, height: size }}
            className={['block shrink-0 object-contain', className].filter(Boolean).join(' ')}
        />
    );
}

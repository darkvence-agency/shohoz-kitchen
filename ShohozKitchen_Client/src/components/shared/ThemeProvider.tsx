"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';

interface ThemeContextType {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    faviconUrl: string;
    isLoaded: boolean;
}

const DEFAULT_LOGO = '/logo.svg';

const defaultTheme: ThemeContextType = {
    primaryColor: '#f15a24',
    secondaryColor: '#f4784b',
    logoUrl: DEFAULT_LOGO,
    faviconUrl: '',
    isLoaded: false,
};

/* Old defaults that were never explicitly set by an admin — ignore them
   so upgrading the brand color doesn't require a DB migration. */
const LEGACY_PRIMARIES = new Set(['#4F46E5', '#4338CA', '#6366F1', '#F85606', '#f85606', 'var(--color-primary)', 'var(--color-primary)']);

const ThemeContext = createContext<ThemeContextType>(defaultTheme);

export const useTheme = () => useContext(ThemeContext);

/* ─── Color Helpers ─── */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    try {
        hex = hex.replace('#', '');
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16),
        };
    } catch { return null; }
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(Math.max(0, rgb.r - amount), Math.max(0, rgb.g - amount), Math.max(0, rgb.b - amount));
}

function lighten(hex: string, factor: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(
        Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
        Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
        Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor)),
    );
}

/* Apply a primary + secondary pair to CSS variables immediately.
   Mirrors the shade set declared in globals.css :root — keep both in sync. */
function applyColors(primary: string, secondary: string) {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-dark', darken(primary, 20));
    root.style.setProperty('--color-primary-light', lighten(primary, 0.85));
    root.style.setProperty('--color-primary-lightest', lighten(primary, 0.93));
    root.style.setProperty('--color-primary-border', lighten(primary, 0.7));
    root.style.setProperty('--color-primary-surface', lighten(primary, 0.96));
    root.style.setProperty('--color-secondary', secondary);
    // "r, g, b" form so rgba(var(--color-primary-rgb), alpha) works everywhere.
    const rgb = hexToRgb(primary);
    if (rgb) root.style.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
}

/* ─────────────────────────────────────────────────────────────────── */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { data: res } = useGetSiteContentQuery({});
    const [themeData, setThemeData] = useState<ThemeContextType>(defaultTheme);

    /* Apply brand orange immediately — before the API call resolves,
       so users never see a flash of the old indigo. */
    useEffect(() => {
        applyColors(defaultTheme.primaryColor, defaultTheme.secondaryColor);
    }, []);

    /* When API responds, only override if an admin has explicitly set
       a non-legacy primary color. */
    useEffect(() => {
        if (!res?.data?.theme) return;

        const t = res.data.theme;
        const rawPrimary = t.primaryColor as string | undefined;

        /* Treat legacy indigo defaults as "not explicitly set" — keep orange. */
        const primary = (rawPrimary && !LEGACY_PRIMARIES.has(rawPrimary))
            ? rawPrimary
            : defaultTheme.primaryColor;

        const rawSecondary = t.secondaryColor as string | undefined;
        const secondary = (rawSecondary && !LEGACY_PRIMARIES.has(rawSecondary))
            ? rawSecondary
            : defaultTheme.secondaryColor;

        applyColors(primary, secondary);

        setThemeData({
            primaryColor: primary,
            secondaryColor: secondary,
            logoUrl: t.logoUrl || DEFAULT_LOGO,
            faviconUrl: t.faviconUrl || '',
            isLoaded: true,
        });
    }, [res]);

    return (
        <ThemeContext.Provider value={themeData}>
            {children}
        </ThemeContext.Provider>
    );
}

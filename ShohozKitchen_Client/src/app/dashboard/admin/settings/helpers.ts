/** Small, page-local helpers for the Settings page. */

type ApiError = { data?: { message?: string; errorMessages?: { message?: string }[] } };

/** The most specific message the API returned (Zod issues come back in errorMessages). */
export const apiError = (err: unknown, fallback: string) => {
    const data = (err as ApiError)?.data;
    return data?.errorMessages?.[0]?.message || data?.message || fallback;
};

export type Parsed = { value?: number; error?: string };

/** A whole-or-decimal amount of taka, ≥ 0. */
export function parseMoney(text: string): Parsed {
    const t = text.trim();
    if (!t) return { error: 'Required' };
    const n = Number(t);
    if (!Number.isFinite(n)) return { error: 'Enter a number' };
    if (n < 0) return { error: 'Cannot be negative' };
    return { value: n };
}

/** A percentage typed by staff → integer basis points (1% = 100 bps, 0.01% = 1 bp). */
export function parsePercentToBps(text: string): Parsed {
    const t = text.trim();
    if (!t) return { error: 'Enter a rate' };
    const n = Number(t);
    if (!Number.isFinite(n)) return { error: 'Enter a number' };
    if (n < 0) return { error: 'The rate cannot be negative' };
    if (n > 100) return { error: 'The rate cannot be more than 100%' };
    const bps = n * 100;
    if (Math.abs(bps - Math.round(bps)) > 1e-6) return { error: 'Use at most 2 decimal places (0.01% = 1 basis point)' };
    return { value: Math.round(bps) };
}

/** 100 → "1", 150 → "1.5", 125 → "1.25" */
export const bpsToPercentText = (bps: number) => String(Math.round(bps) / 100);

export const isHexColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/**
 * The value a CSS custom property has in the stylesheet's `:root` rule (globals.css),
 * i.e. the built-in default — not the runtime override ThemeProvider applies inline.
 * Used to show the real default colour when the store has no custom colour saved.
 */
export function cssRootDefault(name: string): string {
    if (typeof document === 'undefined') return '';
    const walk = (rules: CSSRuleList): string => {
        for (const rule of Array.from(rules)) {
            if (rule instanceof CSSStyleRule && rule.selectorText.split(',').some((s) => s.trim() === ':root')) {
                const v = rule.style.getPropertyValue(name).trim();
                if (v) return v;
            }
            const nested = (rule as CSSGroupingRule).cssRules;
            if (nested && nested.length) {
                const v = walk(nested);
                if (v) return v;
            }
        }
        return '';
    };
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            const v = walk(sheet.cssRules);
            if (v) return v;
        } catch {
            // Cross-origin stylesheet (e.g. Google Fonts) — its rules are not readable.
        }
    }
    return '';
}

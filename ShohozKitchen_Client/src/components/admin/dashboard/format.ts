/* Formatting helpers for the admin home page. */

/** 'YYYY-MM-DD' (a Dhaka calendar day from the API) → "19 Aug 2026". */
export const fmtDay = (key: string, withYear = true) => {
    const d = new Date(`${key}T12:00:00+06:00`);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'Asia/Dhaka',
    });
};

/** Weekday for the tooltip: "Fri". */
export const fmtWeekday = (key: string) => {
    const d = new Date(`${key}T12:00:00+06:00`);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'Asia/Dhaka' });
};

const trim = (n: number) => (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');

/** Axis-sized numbers in the South-Asian scale: 950 · 12K · 2.5L · 1.2Cr. */
export const compact = (n: number) => {
    const a = Math.abs(n);
    if (a >= 1e7) return `${trim(n / 1e7)}Cr`;
    if (a >= 1e5) return `${trim(n / 1e5)}L`;
    if (a >= 1e3) return `${trim(n / 1e3)}K`;
    return trim(n);
};

export const compactTaka = (n: number) => `৳${compact(n)}`;

/** Round an axis maximum up to 1 / 2 / 2.5 / 5 × 10ⁿ so the gridlines land on clean numbers. */
export const niceMax = (max: number) => {
    if (!(max > 0)) return 1;
    const pow = 10 ** Math.floor(Math.log10(max));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= max) return m * pow;
    return 10 * pow;
};

/** Percentage change, or null when there is nothing to compare with. */
export const pctChange = (current: number, previous: number): number | null => {
    if (!(previous > 0)) return null;
    return ((current - previous) / previous) * 100;
};

export const count = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-IN');

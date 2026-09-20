/**
 * Report dates are Bangladesh calendar days as YYYY-MM-DD strings. They are
 * handled as plain strings (UTC math) so the viewer's own timezone never shifts
 * a day.
 */

export const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Today in Dhaka, YYYY-MM-DD. */
export const dhakaToday = (): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const addDays = (day: string, n: number): string =>
    new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

export const daySpan = (from: string, to: string): number =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;

export const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

/** 17 Sep 2026 */
export const fmtDay = (day: string) =>
    asDate(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "17 Sep 2026", "1 – 17 Sep 2026", "28 Aug – 17 Sep 2026", "1 Dec 2025 – 17 Sep 2026" */
export function fmtPeriod(from: string, to: string): string {
    if (from === to) return fmtDay(from);
    const [fy, fm] = from.split('-');
    const [ty, tm] = to.split('-');
    const d = (s: string, o: Intl.DateTimeFormatOptions) => asDate(s).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
    if (fy !== ty) return `${fmtDay(from)} – ${fmtDay(to)}`;
    if (fm !== tm) return `${d(from, { day: 'numeric', month: 'short' })} – ${fmtDay(to)}`;
    return `${d(from, { day: 'numeric' })} – ${fmtDay(to)}`;
}

/** Label for a trend bucket key. */
export function bucketLabel(key: string, granularity: 'hour' | 'day' | 'month', long = false): string {
    if (granularity === 'hour') {
        const h = Number(key);
        const h12 = h % 12 === 0 ? 12 : h % 12;
        const ap = h < 12 ? 'am' : 'pm';
        return long ? `${h12}:00 ${ap} – ${h12}:59 ${ap}` : `${h12}${ap}`;
    }
    if (granularity === 'day') {
        return asDate(key).toLocaleDateString('en-GB', long
            ? { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }
            : { day: 'numeric', month: 'short', timeZone: 'UTC' });
    }
    return asDate(`${key}-01`).toLocaleDateString('en-GB', long
        ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
        : { month: 'short', timeZone: 'UTC' });
}

export type Preset = { key: string; label: string; range: () => { from: string; to: string } };

export const PRESETS: Preset[] = [
    { key: 'today', label: 'Today', range: () => { const t = dhakaToday(); return { from: t, to: t }; } },
    { key: 'yesterday', label: 'Yesterday', range: () => { const y = addDays(dhakaToday(), -1); return { from: y, to: y }; } },
    { key: '7d', label: 'Last 7 days', range: () => { const t = dhakaToday(); return { from: addDays(t, -6), to: t }; } },
    { key: '30d', label: 'Last 30 days', range: () => { const t = dhakaToday(); return { from: addDays(t, -29), to: t }; } },
    { key: 'month', label: 'This month', range: () => { const t = dhakaToday(); return { from: `${t.slice(0, 8)}01`, to: t }; } },
    {
        key: 'lastMonth', label: 'Last month', range: () => {
            const firstThis = `${dhakaToday().slice(0, 8)}01`;
            const lastPrev = addDays(firstThis, -1);
            return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
        },
    },
    // Fits inside MAX_RANGE_DAYS (366) even in a leap year.
    { key: 'year', label: 'This year', range: () => { const t = dhakaToday(); return { from: `${t.slice(0, 4)}-01-01`, to: t }; } },
];

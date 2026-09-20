import { taka } from '@/components/admin/ui';

/** ৳15,19,890 / ৳18,03,672.16 — decimals only when there are paisa; −৳150 for a negative. */
export const money = (n: number | null | undefined) => {
    const v = Number(n || 0);
    const abs = Math.abs(v);
    const s = taka(abs, Math.round(abs * 100) % 100 ? 2 : 0);
    return v < 0 ? `−${s}` : s;
};

/** Axis labels: ৳850, ৳12K, ৳1.2L, ৳3.4Cr (South-Asian scale). */
export const compactTaka = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? '−' : '';
    const fmt = (v: number, unit: string) => `${sign}৳${Number(v.toFixed(v < 10 ? 1 : 0))}${unit}`;
    if (abs >= 1e7) return fmt(abs / 1e7, 'Cr');
    if (abs >= 1e5) return fmt(abs / 1e5, 'L');
    if (abs >= 1e3) return fmt(abs / 1e3, 'K');
    return `${sign}৳${Math.round(abs)}`;
};

export const count = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-IN');

/** "1 order" / "4,595 orders" */
export const plural = (n: number, one: string, many = `${one}s`) => `${count(n)} ${n === 1 ? one : many}`;

/** 10 Sep 2026, in Bangladesh time */
export const fmtDhakaDate = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }) : '—';

/** 4:51 pm, in Bangladesh time */
export const fmtDhakaTime = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' }) : '—';

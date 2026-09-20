import { store } from '@/redux/store';
import type { ReportPeriod } from '@/redux/api/analyticsApi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Save a Blob as a file in the browser. */
function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const cell = (v: unknown): string => {
    const s = String(v ?? '');
    // Quote anything with a comma/quote/newline; neutralise spreadsheet formulas.
    const safe = /^[=+\-@]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Download rows as a UTF-8 CSV that Excel opens with Bangla text intact. */
export function downloadCsv(fileName: string, headers: string[], rows: (string | number)[][]) {
    const csv = [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
    saveBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }), fileName);
}

/** File-name part for a period: "2026-09-17" or "2026-09-01_to_2026-09-17". */
export const periodSlug = (p: ReportPeriod) => (p.from === p.to ? p.from : `${p.from}_to_${p.to}`);

/** Fetch the period's Sales report PDF (auth like baseApi) and save it. */
export async function downloadSalesPdf(p: ReportPeriod): Promise<void> {
    const token = store.getState().auth.token || localStorage.getItem('token');
    const qs = new URLSearchParams({ from: p.from, to: p.to }).toString();
    const res = await fetch(`${API_URL}/analytics/report/pdf?${qs}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Failed to download report (status ${res.status})`);
    saveBlob(await res.blob(), `ShohozKitchen-Sales-Report-${periodSlug(p)}.pdf`);
}

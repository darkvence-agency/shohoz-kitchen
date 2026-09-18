import { store } from '@/redux/store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Downloads an analytics report PDF for the given role and triggers a browser
 * download.
 *
 * Replicates baseApi auth: Bearer token from the redux auth slice, falling back
 * to localStorage('token'). SSR-safe — only runs in the browser.
 *
 * @param path 'admin' -> /analytics/report/pdf
 * @throws Error on a non-ok response so callers can toast an error
 */
export async function downloadReportPdf(path: 'admin'): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const token =
        store.getState().auth.token ||
        (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

    const url = API_URL + '/analytics/report/pdf';

    const headers: Record<string, string> = {};
    if (token) {
        headers['authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers,
    });

    if (!response.ok) {
        throw new Error(`Failed to download report (status ${response.status})`);
    }

    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = 'ShohozKitchen-Analytics-' + path + '.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.URL.revokeObjectURL(objectUrl);
}

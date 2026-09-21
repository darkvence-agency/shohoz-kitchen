/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Site content read on the server, for things that must be in the first HTML the
 * browser (and Google) receives: the SEO title and description, the search-console
 * verification tags, and the tracking IDs.
 *
 * Cached for a minute, so a change in the admin panel shows on the site within about
 * a minute without a redeploy. Any failure — API down, slow, or unreachable during a
 * build — returns null and the site falls back to its built-in defaults.
 */

// On the server a relative URL has nothing to resolve against and hangs until it
// times out (see next.config.ts), so always reach the API by an absolute address.
const API_BASE = process.env.INTERNAL_API_URL
    ? `${process.env.INTERNAL_API_URL}/api`
    : process.env.NEXT_PUBLIC_API_URL?.startsWith('http')
        ? process.env.NEXT_PUBLIC_API_URL
        : 'http://localhost:5000/api';

export const SITE_CONTENT_REVALIDATE = 60;

export async function getSiteContent(): Promise<any | null> {
    try {
        const res = await fetch(`${API_BASE}/site-content`, {
            next: { revalidate: SITE_CONTENT_REVALIDATE },
            signal: AbortSignal.timeout(4000),
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.data ?? null;
    } catch {
        return null;
    }
}

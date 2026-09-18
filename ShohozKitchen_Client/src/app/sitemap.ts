import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Revalidate the sitemap hourly so new products/categories show up.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    // ── Static routes (always present) ──────────────────────────────
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
        { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
        { url: `${SITE_URL}/track`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    ];

    const dynamicRoutes: MetadataRoute.Sitemap = [];

    // ── Products ─────────────────────────────────────────────────────
    try {
        const res = await fetch(`${API_BASE}/products?limit=200`, { next: { revalidate } });
        if (res.ok) {
            const json = await res.json();
            const products: any[] = Array.isArray(json?.data) ? json.data : [];
            for (const p of products) {
                if (p?.slug) {
                    dynamicRoutes.push({
                        url: `${SITE_URL}/product/${p.slug}`,
                        lastModified: p?.updatedAt ? new Date(p.updatedAt) : now,
                        changeFrequency: 'weekly',
                        priority: 0.8,
                    });
                }
            }
        }
    } catch {
        // Network/API failure — fall through with static routes only.
    }

    // ── Categories ───────────────────────────────────────────────────
    try {
        const res = await fetch(`${API_BASE}/categories`, { next: { revalidate } });
        if (res.ok) {
            const json = await res.json();
            const categories: any[] = Array.isArray(json?.data) ? json.data : [];
            for (const c of categories) {
                if (c?.slug) {
                    dynamicRoutes.push({
                        url: `${SITE_URL}/category/${c.slug}`,
                        lastModified: c?.updatedAt ? new Date(c.updatedAt) : now,
                        changeFrequency: 'weekly',
                        priority: 0.7,
                    });
                }
            }
        }
    } catch {
        // Network/API failure — fall through with static routes only.
    }

    return [...staticRoutes, ...dynamicRoutes];
}

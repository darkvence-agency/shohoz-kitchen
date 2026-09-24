import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { decodeSlug, productPath } from '@/lib/productUrl';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** @param slug plain text — encoded here for the request. */
async function getProduct(slug: string): Promise<any | null> {
    try {
        // Public product detail route — GET /api/products/slug/:slug
        const res = await fetch(`${API_BASE}/products/slug/${encodeURIComponent(slug)}`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        const json = await res.json();
        return json?.data ?? null;
    } catch {
        return null;
    }
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    // The route param is the raw path segment, so a non-ASCII slug arrives percent-encoded.
    const slug = decodeSlug((await params).slug);
    const product = await getProduct(slug);

    if (!product) {
        return {
            title: 'Product',
            description: 'Shop quality products at the best prices with Shohoz Kitchen.',
        };
    }

    // The API also answers on a product's old slugs (legacySlugs), always with its current
    // one. Move the browser onto that — a product should have a single, indexable link.
    // Both sides are plain text here, so a Bengali slug compares equal to itself.
    const canonicalSlug: string = typeof product.slug === 'string' && product.slug ? product.slug : slug;
    if (canonicalSlug !== slug) permanentRedirect(productPath(canonicalSlug));

    const name: string = product.name || 'Product';
    const rawDesc: string = product.description || '';
    // Strip any HTML and trim to a sensible meta-description length.
    const description =
        rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
        `Buy ${name} at the best price on Shohoz Kitchen.`;
    const image: string | undefined = product.thumbnail || undefined;

    return {
        title: name,
        description,
        alternates: { canonical: productPath(canonicalSlug) },
        openGraph: {
            type: 'website',
            title: name,
            description,
            url: productPath(canonicalSlug),
            images: image ? [{ url: image, alt: name }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title: name,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
    return children;
}

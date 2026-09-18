import type { Metadata } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getProduct(slug: string): Promise<any | null> {
    try {
        // Public product detail route — GET /api/products/slug/:slug
        const res = await fetch(`${API_BASE}/products/slug/${slug}`, {
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
    const { slug } = await params;
    const product = await getProduct(slug);

    if (!product) {
        return {
            title: 'Product',
            description: 'Shop quality products at the best prices with Shohoz Kitchen.',
        };
    }

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
        alternates: { canonical: `/product/${slug}` },
        openGraph: {
            type: 'website',
            title: name,
            description,
            url: `/product/${slug}`,
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

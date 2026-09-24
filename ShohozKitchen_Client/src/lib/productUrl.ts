/**
 * A product's slug can hold letters of any script (a Bengali product name stays readable
 * in its link), and a URL carries those percent-encoded. A route param arrives in that
 * encoded form, while the slug the API answers with is the plain text — so the two must be
 * brought to the same form before they are ever compared, or a non-ASCII slug looks
 * "wrong" on every load and the page redirects to itself for ever.
 */

/** A slug taken from the URL, as plain text. Already-plain text is returned unchanged. */
export function decodeSlug(raw: unknown): string {
    const s = typeof raw === 'string' ? raw : '';
    try {
        return decodeURIComponent(s);
    } catch {
        // A stray '%' that is not an escape: keep what we were given rather than throw.
        return s;
    }
}

/** The link to a product, with the slug encoded for a URL. */
export function productPath(slug: string): string {
    return `/product/${encodeURIComponent(slug)}`;
}

import type { Model } from 'mongoose';
import AppError from '../../utils/AppError';

// ── Short SKU + product link rules ─────────────────────────────────────
// One implementation, shared by the model's save hook, the product service, the
// SKU-suggest endpoint and scripts/migrate-short-sku.ts. Kept apart from the
// service because the model needs it too (the service imports the model).

/** A SKU typed on the product form: letters, digits and dashes, 2–12 characters. */
export const MANUAL_SKU_PATTERN = /^[A-Z0-9-]{2,12}$/;

/** Longest name part of a slug; the SKU is appended after it. */
const SLUG_NAME_MAX = 80;

/**
 * Two-letter SKU prefix from the name: the first Latin letter of each of the first
 * two words that have one ("Non-stick Fry Pan" → "NF"). A single such word gives its
 * first two letters ("Colander" → "CO", padded with X if it has only one); a name
 * with no Latin letters at all gives "PR".
 */
export function skuPrefix(name: string): string {
    const words = String(name ?? '')
        .trim()
        .split(/\s+/)
        .map((w) => w.toUpperCase().match(/[A-Z]/g) || [])
        .filter((letters) => letters.length > 0);
    if (words.length >= 2) return words[0][0] + words[1][0];
    if (words.length === 1) return words[0][0] + (words[0][1] || 'X');
    return 'PR';
}

/**
 * The next SKU for a prefix, given SKUs already taken: highest `PREFIX<number>` + 1,
 * zero-padded to two digits (NF01 … NF99, NF100). Other SKUs are ignored.
 */
export function nextSku(prefix: string, taken: Iterable<string>): string {
    const rx = new RegExp(`^${prefix}(\\d+)$`, 'i');
    let max = 0;
    for (const sku of taken) {
        const m = rx.exec(String(sku ?? ''));
        if (m) max = Math.max(max, Number(m[1]));
    }
    return prefix + String(max + 1).padStart(2, '0');
}

/**
 * The next free SKU for a product name. Soft-deleted products count: they keep their
 * SKU in the unique index. (distinct() does not run the model's pre('find') filter.)
 */
export async function generateSku(ProductModel: Model<any>, name: string): Promise<string> {
    const prefix = skuPrefix(name);
    const taken: unknown[] = await ProductModel.distinct('sku', { sku: { $regex: `^${prefix}\\d+$`, $options: 'i' } });
    return nextSku(prefix, taken as string[]);
}

/**
 * A SKU sent by the form, tidied: trimmed and uppercased. Empty → '' (the caller then
 * generates one). Anything outside MANUAL_SKU_PATTERN is refused with a 400.
 */
export function parseManualSku(raw: unknown): string {
    const sku = raw == null ? '' : String(raw).trim().toUpperCase();
    if (sku && !MANUAL_SKU_PATTERN.test(sku)) {
        throw new AppError(400, 'SKU must be 2–12 characters: letters, numbers and dashes only (e.g. NF01). Leave it empty to get one automatically.');
    }
    return sku;
}

/** Is this SKU used by any other product (case-insensitive, deleted products included)? */
export async function isSkuTaken(ProductModel: Model<any>, sku: string, excludeId?: string): Promise<boolean> {
    const filter: Record<string, unknown> = {
        sku: { $regex: `^${sku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    // exists() is a findOne, which the soft-delete pre('find') hook does not touch.
    return Boolean(await ProductModel.exists(filter));
}

/**
 * "Non-stick Fry Pan 26cm" → "non-stick-fry-pan-26cm" (at most 80 characters).
 *
 * Letters of any script are kept, so a Bengali name kept its words instead of being
 * thrown away — "ডাল কাটার দা" → "ডাল-কাটার-দা", not "product". Browsers percent-encode
 * those on the wire and show them readably in the address bar. Only spaces and
 * punctuation become dashes.
 */
export function slugifyName(name: string): string {
    const slug = String(name ?? '')
        .toLowerCase()
        // \p{M} matters: Bengali vowel signs and hasanta are combining marks, not
        // letters, so leaving them out would reduce "কাস্তে" to "ক-স-ত".
        .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
        .replace(/^-+|-+$/g, '');
    if (slug.length <= SLUG_NAME_MAX) return slug;
    // Cut on a dash so the last word is not left half-written — Bengali letters carry
    // combining marks, and slicing mid-cluster would mangle them.
    const cut = slug.slice(0, SLUG_NAME_MAX);
    const lastDash = cut.lastIndexOf('-');
    return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/, '');
}

/**
 * A product's link: its name, then its SKU as the last segment
 * ("non-stick-fry-pan-26cm-nf01"). SKUs that predate the short format may carry
 * characters a URL should not, so the SKU part is cleaned the same way.
 */
export function buildProductSlug(name: string, sku: string): string {
    const skuPart = String(sku ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${slugifyName(name) || 'product'}-${skuPart}`;
}

/** Earlier slugs plus the one being replaced — no repeats, and never the current slug. */
export function mergeLegacySlugs(existing: unknown, replaced: unknown, current: string): string[] {
    const all = [...(Array.isArray(existing) ? existing : []), replaced];
    return [...new Set(all.filter((s): s is string => typeof s === 'string' && s !== '' && s !== current))];
}

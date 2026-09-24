/**
 * Migration: short SKUs (NF01) and name + SKU product links.
 *
 * Gives every product a short SKU, unless it already has one, and rebuilds its slug
 * as name + SKU ("non-stick-fry-pan-26cm-nf01"). The slug it replaces goes into
 * `legacySlugs`, so old links keep working. Products are numbered oldest first.
 * Soft-deleted products are included: they keep their SKU in the unique index.
 * The rules are the app's own (app/modules/product/product.sku.ts).
 *
 *   node dist/src/scripts/migrate-short-sku.js [--dry-run]        show the plan, write nothing
 *   node dist/src/scripts/migrate-short-sku.js --backup <file>    save every product's sku / slug / legacySlugs
 *   node dist/src/scripts/migrate-short-sku.js --apply <file>     apply the plan (needs that backup, current)
 *   node dist/src/scripts/migrate-short-sku.js --restore <file>   put sku / slug / legacySlugs back from it
 *
 * Connects to DATABASE_URL. Exits non-zero on any failure.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import config from '../app/config';
import { buildProductSlug, mergeLegacySlugs, nextSku, skuPrefix } from '../app/modules/product/product.sku';

const USAGE = 'Usage: node dist/src/scripts/migrate-short-sku.js [--dry-run] | --backup <file> | --apply <backupFile> | --restore <backupFile>';

// A product already migrated has a SKU of this shape and a slug ending in it.
const SHORT_SKU = /^[A-Z]{2}\d{2,3}$/;

type Row = {
    _id: mongoose.Types.ObjectId;
    name?: string;
    sku?: string | null;
    slug?: string | null;
    legacySlugs?: string[] | null;
    isDeleted?: boolean;
};
type Step = { row: Row; sku: string; slug: string; done: boolean };
// null = the field was not set on the product.
type BackupRow = { _id: string; sku: string | null; slug: string | null; legacySlugs: string[] | null };

// The raw collection: no soft-delete filter and no model hooks.
const products = () => mongoose.connection.collection('products');

async function loadProducts(): Promise<Row[]> {
    return (await products()
        .find({}, { projection: { name: 1, sku: 1, slug: 1, legacySlugs: 1, isDeleted: 1 } })
        .sort({ createdAt: 1, _id: 1 })
        .toArray()) as unknown as Row[];
}

/** The new SKU and slug of every product, oldest first. */
function planSteps(rows: Row[]): Step[] {
    // SKUs that are already short stay, and are taken from the start, so a new number
    // never lands on one of them, whichever product is older.
    const taken = new Set(rows.map((r) => r.sku || '').filter((s) => SHORT_SKU.test(s)));
    return rows.map((row) => {
        const name = row.name || '';
        const oldSku = row.sku || '';
        const oldSlug = row.slug || '';
        if (SHORT_SKU.test(oldSku)) {
            const done = oldSlug.endsWith(`-${oldSku.toLowerCase()}`);
            return { row, sku: oldSku, slug: done ? oldSlug : buildProductSlug(name, oldSku), done };
        }
        const sku = nextSku(skuPrefix(name), taken);
        taken.add(sku);
        return { row, sku, slug: buildProductSlug(name, sku), done: false };
    });
}

const changes = (steps: Step[]) => steps.filter((s) => !s.done && (s.sku !== s.row.sku || s.slug !== s.row.slug));

/** Every SKU and slug unique afterwards, and none still held by another product when written. */
function checkSteps(steps: Step[]): string[] {
    const problems: string[] = [];
    const seenSku = new Map<string, Row>();
    const seenSlug = new Map<string, Row>();
    for (const { row, sku, slug } of steps) {
        const other = seenSku.get(sku.toUpperCase());
        if (other) problems.push(`SKU ${sku} would be on both "${other.name}" and "${row.name}"`);
        seenSku.set(sku.toUpperCase(), row);
        const otherSlug = seenSlug.get(slug);
        if (otherSlug) problems.push(`slug ${slug} would be on both "${otherSlug.name}" and "${row.name}"`);
        seenSlug.set(slug, row);
    }
    // Products are written one at a time, in this order: replay that, so a new value is
    // never one another product still holds when its turn comes (the unique indexes
    // compare exactly, so this does too).
    const skuNow = new Map(steps.filter((s) => s.row.sku).map((s) => [String(s.row.sku), s.row]));
    const slugNow = new Map(steps.filter((s) => s.row.slug).map((s) => [String(s.row.slug), s.row]));
    for (const { row, sku, slug } of changes(steps)) {
        const skuHolder = skuNow.get(sku);
        if (skuHolder && skuHolder !== row) problems.push(`SKU ${sku} for "${row.name}" is still used by "${skuHolder.name}"`);
        if (row.sku) skuNow.delete(row.sku);
        skuNow.set(sku, row);
        const slugHolder = slugNow.get(slug);
        if (slugHolder && slugHolder !== row) problems.push(`slug ${slug} for "${row.name}" is still used by "${slugHolder.name}"`);
        if (row.slug) slugNow.delete(row.slug);
        slugNow.set(slug, row);
    }
    return problems;
}

const arrow = (from: unknown, to: string) => (String(from ?? '') === to ? to : `${from ?? '(none)'} → ${to}`);

function printStep({ row, sku, slug, done }: Step) {
    const label = `${row.name || '(no name)'}${row.isDeleted ? ' (deleted)' : ''}`;
    console.log(`  ${label} | ${arrow(row.sku, sku)} | ${arrow(row.slug, slug)}${done ? '   [already done]' : ''}`);
}

function printTotals(steps: Step[]) {
    const todo = changes(steps);
    console.log(
        `\n${steps.length} products: ${todo.length} to change ` +
        `(${todo.filter((s) => s.sku !== s.row.sku).length} new SKUs, ${todo.filter((s) => s.slug !== s.row.slug).length} new slugs), ` +
        `${steps.length - todo.length} unchanged.`
    );
}

/** The plan, checked; throws before anything is written if it is not safe. */
async function checkedPlan(): Promise<{ rows: Row[]; steps: Step[] }> {
    const rows = await loadProducts();
    const steps = planSteps(rows);
    const problems = checkSteps(steps);
    if (problems.length) {
        problems.forEach((p) => console.error(`  ✖ ${p}`));
        throw new Error(`${problems.length} conflict(s) in the plan — nothing written.`);
    }
    return { rows, steps };
}

function readBackup(file: string): BackupRow[] {
    if (!fs.existsSync(file)) throw new Error(`Backup ${file} not found — run --backup ${file} first.`);
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(data) || data.some((b) => !b || typeof b._id !== 'string')) {
        throw new Error(`${file} is not a backup written by this script.`);
    }
    return data;
}

const toId = (id: string) => (/^[0-9a-f]{24}$/i.test(id) ? new mongoose.Types.ObjectId(id) : id);

async function dryRun() {
    const rows = await loadProducts();
    const steps = planSteps(rows);
    console.log('Dry run — nothing is written.\n  name | sku | slug');
    steps.forEach(printStep);
    printTotals(steps);
    const problems = checkSteps(steps);
    if (problems.length) {
        problems.forEach((p) => console.error(`  ✖ ${p}`));
        throw new Error(`${problems.length} conflict(s) — --apply would refuse this plan.`);
    }
    console.log('Every new SKU and slug is unique.');
}

async function backup(file: string) {
    // Never overwrite: a second backup taken after --apply would lose the old values.
    if (fs.existsSync(file)) throw new Error(`${file} already exists — pick a new file name.`);
    const rows = await loadProducts();
    const data: BackupRow[] = rows.map((r) => ({
        _id: String(r._id),
        sku: r.sku ?? null,
        slug: r.slug ?? null,
        legacySlugs: r.legacySlugs ?? null,
    }));
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`Saved sku / slug / legacySlugs of ${data.length} products to ${path.resolve(file)}`);
}

async function apply(file: string) {
    const saved = readBackup(file);
    const { rows, steps } = await checkedPlan();
    // The backup must be of the catalogue as it is now, or --restore could not undo this.
    const savedIds = new Set(saved.map((b) => b._id));
    const unsaved = rows.filter((r) => !savedIds.has(String(r._id)));
    if (saved.length !== rows.length || unsaved.length) {
        throw new Error(`${file} holds ${saved.length} products, the database ${rows.length} (${unsaved.length} not in the backup) — take a fresh backup first.`);
    }

    const todo = changes(steps);
    console.log(`Applying ${todo.length} change(s) of ${steps.length} products:`);
    for (const step of todo) {
        const { row, sku, slug } = step;
        const set: Record<string, unknown> = { sku, slug };
        if (slug !== row.slug) set.legacySlugs = mergeLegacySlugs(row.legacySlugs, row.slug, slug);
        // Guarded on the values just read, so a product edited meanwhile is not overwritten.
        const res = await products().updateOne({ _id: row._id, sku: row.sku ?? null, slug: row.slug ?? null }, { $set: set });
        if (res.matchedCount !== 1) {
            throw new Error(`"${row.name}" (${row._id}) changed while migrating — stopped; run --apply again.`);
        }
        printStep(step);
    }
    console.log(`\nDone: ${todo.length} product(s) changed.`);
}

async function restore(file: string) {
    const saved = readBackup(file);
    let failed = 0;
    for (const b of saved) {
        const set: Record<string, unknown> = {};
        const unset: Record<string, ''> = {};
        for (const key of ['sku', 'slug', 'legacySlugs'] as const) {
            if (b[key] === null) unset[key] = '';
            else set[key] = b[key];
        }
        try {
            const res = await products().updateOne(
                { _id: toId(b._id) as any },
                { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }
            );
            if (res.matchedCount !== 1) {
                failed++;
                console.error(`  ✖ ${b._id} is no longer in the database`);
                continue;
            }
            console.log(`  ${b._id} | ${b.sku ?? '(none)'} | ${b.slug ?? '(none)'}`);
        } catch (err: any) {
            failed++;
            console.error(`  ✖ ${b._id}: ${err?.message || err}`);
        }
    }
    if (failed) throw new Error(`${failed} of ${saved.length} product(s) not restored.`);
    console.log(`\nRestored ${saved.length} product(s).`);
}

async function main() {
    const [mode = '--dry-run', file] = process.argv.slice(2);
    if (!['--dry-run', '--backup', '--apply', '--restore'].includes(mode)) throw new Error(USAGE);
    if (mode !== '--dry-run' && !file) throw new Error(USAGE);
    // config falls back to a local database; this must run against the real one on purpose.
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

    // No index or collection building from here — the app does that on start.
    await mongoose.connect(config.database_url, { autoIndex: false, autoCreate: false });
    console.log(`Connected to ${mongoose.connection.name}\n`);

    if (mode === '--backup') await backup(file);
    else if (mode === '--apply') await apply(file);
    else if (mode === '--restore') await restore(file);
    else await dryRun();
}

main()
    .then(() => mongoose.disconnect())
    .catch(async (err) => {
        console.error(`\n✖ ${err?.message || err}`);
        await mongoose.disconnect().catch(() => undefined);
        process.exit(1);
    });

import config from '../../config';
import CourierService, { activeBookedRefs } from './courier.service';

// ── Background delivery-status sync ──────────────────────────────────
// Fallback for when the Steadfast webhook isn't wired up: every N minutes
// pull the latest status for booked, still-in-transit packages. Opt-in via
// STEADFAST_AUTO_SYNC=true so it never surprises a serverless/Vercel deploy.

const MAX_PER_RUN = 80; // safety cap so a backlog can't blast the API in one tick

let timer: NodeJS.Timeout | null = null;

async function runOnce(): Promise<void> {
    // Up to MAX_PER_RUN booked parcels that are still moving, oldest-synced first —
    // the same set the board's "Sync all" works on.
    const items = await activeBookedRefs(MAX_PER_RUN);
    if (!items.length) return;
    const out = await CourierService.bulkRefresh(items);
    console.log(`📦 Steadfast auto-sync: refreshed ${out.ok}/${out.total} package(s).`);
}

export function startCourierAutoSync(): void {
    const { api_key, secret_key, auto_sync, auto_sync_minutes } = config.steadfast;
    if (!auto_sync) return;                       // not opted in
    if (!api_key || !secret_key) {
        console.log('⏭️  Steadfast auto-sync enabled but API keys are missing — skipping.');
        return;
    }
    if (timer) return;                            // guard against double-start

    const everyMs = Math.max(5, auto_sync_minutes) * 60 * 1000;
    console.log(`🔁 Steadfast auto-sync ON — every ${auto_sync_minutes} min.`);
    timer = setInterval(() => {
        runOnce().catch((e) => console.error('Steadfast auto-sync error:', e?.message || e));
    }, everyMs);
    // First pass shortly after boot (let DB settle).
    setTimeout(() => runOnce().catch(() => {}), 15_000);
}

export function stopCourierAutoSync(): void {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

// scripts/cron-once.mjs
//
// Single-shot variant of cron-worker.mjs, built for Railway's native Cron
// Schedule feature: Railway starts this process on its own schedule, it
// does exactly one check against /api/cron/update-orders, then exits —
// Railway handles the repeating part itself instead of this script looping
// forever in-process the way cron-worker.mjs does. That means Railway only
// bills for the few seconds each run actually takes, not an always-on
// container idling between checks.
//
// cron-worker.mjs is untouched and still works as-is for local dev
// (`npm run cron`, polling every 30s) — this is a separate entry point
// for the Railway deployment, not a replacement.
//
// Local test: node --env-file=.env.local scripts/cron-once.mjs

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

if (!CRON_SECRET) {
  console.error("[cron-once] CRON_SECRET is not set.");
  process.exit(1);
}

try {
  const res = await fetch(`${BASE_URL}/api/cron/update-orders`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
    signal: AbortSignal.timeout(10000),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("[cron-once]", new Date().toISOString(), "error:", data);
    process.exit(1);
  }

  console.log("[cron-once]", new Date().toISOString(), data);
} catch (err) {
  console.error("[cron-once] fetch error:", err.message);
  process.exit(1);
}


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

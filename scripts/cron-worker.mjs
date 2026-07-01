import cron from "node-cron";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

if (!CRON_SECRET) {
  console.error("[cron] CRON_SECRET is not set. Run with: node --env-file=.env.local scripts/cron-worker.mjs");
  process.exit(1);
}

console.log(`[cron] Order advancement worker started → ${BASE_URL}/api/cron/update-orders`);

cron.schedule("* * * * *", async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/cron/update-orders`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[cron]", new Date().toISOString(), "error:", data);
      return;
    }

    if (data.advancedToOutForDelivery > 0 || data.advancedToCompleted > 0) {
      console.log("[cron]", new Date().toISOString(), data);
    }
  } catch (err) {
    console.error("[cron] fetch error:", err.message);
  }
});

// lib/rateLimit.ts
//
// Simple in-memory, fixed-window rate limiter for auth endpoints
// (see app/api/login/route.ts and app/api/register/route.ts).
//
// This is intentionally lightweight: a Map living in the Node process's
// memory, good enough for a single server instance (e.g. one Railway
// service). If this app ever runs as multiple instances behind a load
// balancer, each instance keeps its own counters, so the effective limit
// multiplies by instance count — move to a shared store (Redis, or a table
// in the existing MySQL DB) if that becomes the deployment shape.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the Map doesn't grow forever under sustained
// traffic. Runs inline on a check rather than a setInterval, to avoid
// keeping a background timer alive.
function cleanupExpired(now: number) {
  if (buckets.size < 5000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// Counts this call as one attempt against `key` and reports whether it's
// still within `limit` attempts inside the trailing `windowMs`. Call it
// once you know the request is worth counting (e.g. after basic input
// validation, before doing the expensive/sensitive work).
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

// Clears any tracked attempts for `key` — call this after a successful
// login so a legitimate user who mistyped their password a few times isn't
// left counting down a lockout window after they get in correctly.
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

// Extracts the client IP from standard reverse-proxy headers. Route
// Handlers don't get direct socket access, and Railway (like most hosts)
// sits the app behind a proxy that sets x-forwarded-for, so that's the
// reliable source in production. Falls back to a constant key for local
// dev, where there's no proxy in front of `next dev` — local requests just
// share one bucket, which is fine since that's never internet-facing.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

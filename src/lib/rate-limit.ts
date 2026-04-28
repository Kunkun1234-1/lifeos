/**
 * Tiny in-memory rate limiter for AI endpoints.
 *
 * Single-process only. Resets on dev-server restart. Good enough for a
 * single-user app to avoid cost-explosion if a buggy client fires rapid-fire
 * requests; would need Redis-backed counter for multi-instance deploys.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfter: number; resetAt: number };

/**
 * Check & increment a counter under `key`. Returns ok=false when the bucket
 * is exhausted, with seconds-until-reset for a Retry-After header.
 *
 * @param key       e.g. `${userId}:ai-coach`
 * @param max       max requests allowed in the window
 * @param windowMs  bucket window in ms
 */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, resetAt: now + windowMs };
  }
  if (existing.count >= max) {
    return {
      ok: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
      resetAt: existing.resetAt,
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: max - existing.count,
    resetAt: existing.resetAt,
  };
}

// Simple in-memory rate limiter for API routes (per-process).
// Suitable for single-node / pre-production. Replace with Redis in multi-instance deploy.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

/**
 * Sliding fixed-window counter.
 * @param key unique key e.g. `login:ip:1.2.3.4`
 * @param limit max requests per window
 * @param windowMs window length in ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  // Opportunistic cleanup of expired keys (cap map size)
  if (buckets.size > 5000) {
    buckets.forEach((v, k) => {
      if (now >= v.resetAt) buckets.delete(k);
    });
  }

  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function clientIp(request: { headers: Headers }): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}

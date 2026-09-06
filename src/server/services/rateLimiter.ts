interface Bucket {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();

// Bound memory under sustained traffic from many distinct IPs.
const MAX_TRACKED_KEYS = 10_000;

/**
 * Fixed-window rate limiter keyed by client identifier (IP). Returns true if
 * the request is allowed, false if the caller has exceeded `limit` requests
 * within the current window.
 */
export function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    if (buckets.size >= MAX_TRACKED_KEYS) buckets.clear();
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

export function getClientKey(req: Request, server: { requestIP: (req: Request) => { address: string } | null }): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return server.requestIP(req)?.address ?? "unknown";
}

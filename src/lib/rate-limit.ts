import 'server-only';

/**
 * Minimal in-memory sliding-window rate limiter. State is per server
 * process: it resets on restart, and with several Cloud Run instances the
 * effective limit is up to (limit × instances).
 */
export function createRateLimiter({limit, windowMs}: { limit: number; windowMs: number }) {
    const hits = new Map<string, number[]>();

    return function isAllowed(key: string): boolean {
        const now = Date.now();
        const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
        if (recent.length >= limit) {
            hits.set(key, recent);
            return false;
        }
        recent.push(now);
        hits.set(key, recent);

        // Drop stale keys now and then so the map doesn't grow forever
        if (hits.size > 10_000) {
            for (const [k, times] of hits) {
                if (times.every(t => now - t >= windowMs)) hits.delete(k);
            }
        }
        return true;
    };
}

/**
 * Client IP from X-Forwarded-For. Clients can prepend their own entries, so
 * count from the right past the proxies we run: nginx appends one entry
 * (TRUSTED_PROXY_HOPS=1, the default); Google's load balancer appends the
 * client IP and then its own (TRUSTED_PROXY_HOPS=2).
 */
export function clientIp(headers: Headers): string {
    const hops = Math.max(1, parseInt(process.env.TRUSTED_PROXY_HOPS ?? '1', 10) || 1);
    const forwarded = headers.get('x-forwarded-for')?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
    return forwarded[forwarded.length - hops]
        ?? forwarded[0]
        ?? headers.get('x-real-ip')
        ?? 'unknown';
}

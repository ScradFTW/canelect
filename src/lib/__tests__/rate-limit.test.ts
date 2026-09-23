import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {clientIp, createRateLimiter} from '../rate-limit';

describe('createRateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('allows up to the limit, then blocks', () => {
        const allow = createRateLimiter({limit: 3, windowMs: 1000});

        expect([allow('a'), allow('a'), allow('a'), allow('a')]).toEqual([true, true, true, false]);
    });

    it('allows again once the window has passed', () => {
        const allow = createRateLimiter({limit: 1, windowMs: 1000});

        expect(allow('a')).toBe(true);
        expect(allow('a')).toBe(false);
        vi.advanceTimersByTime(1000);
        expect(allow('a')).toBe(true);
    });

    it('tracks each key separately', () => {
        const allow = createRateLimiter({limit: 1, windowMs: 1000});

        expect(allow('a')).toBe(true);
        expect(allow('b')).toBe(true);
        expect(allow('a')).toBe(false);
    });
});

describe('clientIp', () => {
    const headers = (init: Record<string, string>) => new Headers(init);

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses the last X-Forwarded-For entry by default (one proxy, e.g. nginx)', () => {
        expect(clientIp(headers({'x-forwarded-for': '1.1.1.1, 2.2.2.2'}))).toBe('2.2.2.2');
    });

    it('skips the load balancer entry behind Google\'s LB (TRUSTED_PROXY_HOPS=2)', () => {
        vi.stubEnv('TRUSTED_PROXY_HOPS', '2');

        expect(clientIp(headers({'x-forwarded-for': '203.0.113.9, 130.211.0.1'}))).toBe('203.0.113.9');
    });

    it('ignores entries a client prepends to spoof its address', () => {
        vi.stubEnv('TRUSTED_PROXY_HOPS', '2');

        expect(clientIp(headers({'x-forwarded-for': '6.6.6.6, 7.7.7.7, 203.0.113.9, 130.211.0.1'})))
            .toBe('203.0.113.9');
    });

    it('falls back to the first entry when there are fewer entries than hops', () => {
        vi.stubEnv('TRUSTED_PROXY_HOPS', '3');

        expect(clientIp(headers({'x-forwarded-for': '203.0.113.9'}))).toBe('203.0.113.9');
    });

    it('treats an invalid hop count as 1', () => {
        vi.stubEnv('TRUSTED_PROXY_HOPS', 'lots');

        expect(clientIp(headers({'x-forwarded-for': '1.1.1.1, 2.2.2.2'}))).toBe('2.2.2.2');
    });

    it('falls back to X-Real-IP, then "unknown"', () => {
        expect(clientIp(headers({'x-real-ip': '198.51.100.4'}))).toBe('198.51.100.4');
        expect(clientIp(headers({}))).toBe('unknown');
    });
});

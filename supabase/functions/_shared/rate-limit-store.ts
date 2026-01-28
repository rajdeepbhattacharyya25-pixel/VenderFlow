/**
 * Rate Limit Store - Sliding Window Algorithm
 * 
 * In-memory rate limiting for Supabase Edge Functions.
 * Uses sliding window algorithm for fair rate limiting.
 */

interface RateLimitEntry {
    count: number;
    windowStart: number;
    timestamps: number[];
}

// In-memory store (resets on cold start - acceptable for rate limiting)
const store = new Map<string, RateLimitEntry>();

// Cleanup interval (remove expired entries every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * Clean up expired entries from the store
 */
function cleanupExpiredEntries(windowMs: number): void {
    const now = Date.now();

    // Only cleanup periodically to avoid performance impact
    if (now - lastCleanup < CLEANUP_INTERVAL) {
        return;
    }

    lastCleanup = now;
    const cutoff = now - windowMs;

    for (const [key, entry] of store.entries()) {
        if (entry.windowStart < cutoff) {
            store.delete(key);
        }
    }
}

/**
 * Generate a rate limit key from IP and optional identifier
 */
export function generateKey(ip: string, endpoint: string, identifier?: string): string {
    const parts = [ip, endpoint];
    if (identifier) {
        parts.push(identifier);
    }
    return parts.join(':');
}

/**
 * Check rate limit using sliding window algorithm
 * 
 * @param key - Unique identifier for rate limiting (IP:endpoint:identifier)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and metadata
 */
export function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number
): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfterMs: number;
} {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Periodic cleanup
    cleanupExpiredEntries(windowMs);

    // Get or create entry
    let entry = store.get(key);

    if (!entry) {
        entry = {
            count: 0,
            windowStart: now,
            timestamps: []
        };
        store.set(key, entry);
    }

    // Filter out timestamps outside the current window (sliding window)
    entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
    entry.count = entry.timestamps.length;

    // Calculate remaining requests
    const remaining = Math.max(0, maxRequests - entry.count);

    // Calculate when the window resets (when oldest request expires)
    const oldestTimestamp = entry.timestamps[0] || now;
    const resetAt = oldestTimestamp + windowMs;
    const retryAfterMs = remaining === 0 ? resetAt - now : 0;

    // Check if under limit
    if (entry.count < maxRequests) {
        entry.timestamps.push(now);
        entry.count++;

        return {
            allowed: true,
            remaining: remaining - 1,
            resetAt,
            retryAfterMs: 0
        };
    }

    return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterMs
    };
}

/**
 * Reset rate limit for a specific key (useful for testing)
 */
export function resetRateLimit(key: string): void {
    store.delete(key);
}

/**
 * Get current store size (for monitoring)
 */
export function getStoreSize(): number {
    return store.size;
}

/**
 * Rate Limiter Middleware for Supabase Edge Functions
 * 
 * Provides rate limiting protection for API endpoints.
 * Returns 429 Too Many Requests when limit is exceeded.
 */

import { checkRateLimit, generateKey } from './rate-limit-store.ts';

// Default rate limit configurations
export const RATE_LIMITS = {
    // Auth endpoints - stricter limits
    LOGIN: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 per minute
    SIGNUP: { maxRequests: 3, windowMs: 60 * 1000 },     // 3 per minute
    PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 1000 }, // 3 per minute

    // Admin endpoints
    ADMIN: { maxRequests: 10, windowMs: 60 * 1000 },     // 10 per minute

    // Public APIs
    PUBLIC_API: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 per minute

    // General
    DEFAULT: { maxRequests: 20, windowMs: 60 * 1000 }    // 20 per minute
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Extract client IP from request headers
 * Handles various proxy headers (Cloudflare, Vercel, etc.)
 */
export function getClientIP(req: Request): string {
    // Try various headers in order of preference
    const headers = [
        'cf-connecting-ip',      // Cloudflare
        'x-real-ip',             // Nginx
        'x-forwarded-for',       // Standard proxy header
        'x-vercel-forwarded-for', // Vercel
        'x-client-ip'            // Custom
    ];

    for (const header of headers) {
        const value = req.headers.get(header);
        if (value) {
            // x-forwarded-for can contain multiple IPs, take the first one
            return value.split(',')[0].trim();
        }
    }

    return 'unknown';
}

/**
 * CORS headers for responses
 */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create rate limit response headers
 */
function createRateLimitHeaders(
    remaining: number,
    resetAt: number,
    retryAfterSec?: number
): Record<string, string> {
    const headers: Record<string, string> = {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString()
    };

    if (retryAfterSec !== undefined && retryAfterSec > 0) {
        headers['Retry-After'] = Math.ceil(retryAfterSec).toString();
    }

    return headers;
}

/**
 * Apply rate limiting to a request
 * 
 * @param req - The incoming Request object
 * @param endpoint - Endpoint identifier for rate limiting
 * @param limitType - Type of rate limit to apply
 * @param identifier - Optional additional identifier (e.g., email for auth)
 * @returns null if allowed, Response if rate limited
 */
export function applyRateLimit(
    req: Request,
    endpoint: string,
    limitType: RateLimitType = 'DEFAULT',
    identifier?: string
): Response | null {
    const ip = getClientIP(req);
    const key = generateKey(ip, endpoint, identifier);
    const { maxRequests, windowMs } = RATE_LIMITS[limitType];

    const result = checkRateLimit(key, maxRequests, windowMs);

    if (!result.allowed) {
        const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);

        return new Response(
            JSON.stringify({
                error: 'Too Many Requests',
                message: `Rate limit exceeded. Please retry after ${retryAfterSec} seconds.`,
                retryAfter: retryAfterSec
            }),
            {
                status: 429,
                headers: createRateLimitHeaders(
                    result.remaining,
                    result.resetAt,
                    retryAfterSec
                )
            }
        );
    }

    return null; // Request allowed
}

/**
 * Middleware wrapper for rate limiting
 * 
 * Usage:
 * ```ts
 * const rateLimitResponse = await rateLimitMiddleware(req, 'login', 'LOGIN', email);
 * if (rateLimitResponse) return rateLimitResponse;
 * // ... rest of the handler
 * ```
 */
export async function rateLimitMiddleware(
    req: Request,
    endpoint: string,
    limitType: RateLimitType = 'DEFAULT',
    identifier?: string
): Promise<Response | null> {
    return applyRateLimit(req, endpoint, limitType, identifier);
}

/**
 * Create a rate-limited handler wrapper
 * 
 * Usage:
 * ```ts
 * serve(withRateLimit('my-endpoint', 'DEFAULT', async (req) => {
 *   // Your handler logic
 *   return new Response('OK');
 * }));
 * ```
 */
export function withRateLimit(
    endpoint: string,
    limitType: RateLimitType,
    handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
    return async (req: Request) => {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            return new Response('ok', { headers: corsHeaders });
        }

        const rateLimitResponse = applyRateLimit(req, endpoint, limitType);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        return handler(req);
    };
}

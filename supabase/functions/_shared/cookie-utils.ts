/**
 * Cookie Utilities for Supabase Edge Functions
 * 
 * Provides secure cookie management with httpOnly, Secure, and SameSite flags.
 * Used for store customer authentication.
 */

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,                    // Only send over HTTPS
    sameSite: 'Strict' as const,     // CSRF protection
    path: '/',
    maxAge: 7 * 24 * 60 * 60,        // 7 days in seconds
};

const SESSION_COOKIE_NAME = 'store_session';
const CSRF_COOKIE_NAME = 'csrf_token';

export interface SessionData {
    customerId: string;
    sellerId: string;
    sellerSlug: string;
    email: string;
    displayName: string | null;
    expiresAt: number;
}

/**
 * Generate a cryptographically secure random token
 */
export async function generateToken(length: number = 32): Promise<string> {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create session data and encode it for cookie storage
 */
export async function createSessionToken(data: SessionData): Promise<string> {
    // In production, you'd want to encrypt this with a secret key
    // For now, we'll base64 encode the JSON
    const jsonData = JSON.stringify(data);
    return btoa(jsonData);
}

/**
 * Decode and validate session token from cookie
 */
export async function parseSessionToken(token: string): Promise<SessionData | null> {
    try {
        const jsonData = atob(token);
        const data = JSON.parse(jsonData) as SessionData;

        // Check if session is expired
        if (data.expiresAt < Date.now()) {
            return null;
        }

        return data;
    } catch {
        return null;
    }
}

/**
 * Build Set-Cookie header value with security options
 */
export function buildCookieHeader(
    name: string,
    value: string,
    options: Partial<typeof COOKIE_OPTIONS> = {}
): string {
    const opts = { ...COOKIE_OPTIONS, ...options };

    let cookie = `${name}=${encodeURIComponent(value)}`;

    if (opts.httpOnly) cookie += '; HttpOnly';
    if (opts.secure) cookie += '; Secure';
    if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
    if (opts.path) cookie += `; Path=${opts.path}`;
    if (opts.maxAge) cookie += `; Max-Age=${opts.maxAge}`;

    return cookie;
}

/**
 * Build Set-Cookie header for session
 */
export function setAuthCookie(sessionToken: string): string {
    return buildCookieHeader(SESSION_COOKIE_NAME, sessionToken);
}

/**
 * Build Set-Cookie header to clear session (expire immediately)
 */
export function clearAuthCookie(): string {
    return buildCookieHeader(SESSION_COOKIE_NAME, '', {
        maxAge: 0,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
    });
}

/**
 * Parse cookies from request headers
 */
export function parseCookies(req: Request): Record<string, string> {
    const cookieHeader = req.headers.get('Cookie') || '';
    const cookies: Record<string, string> = {};

    cookieHeader.split(';').forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split('=');
        if (name) {
            cookies[name] = decodeURIComponent(valueParts.join('='));
        }
    });

    return cookies;
}

/**
 * Get session from request cookies
 */
export async function getSessionFromCookies(req: Request): Promise<SessionData | null> {
    const cookies = parseCookies(req);
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
        return null;
    }

    return parseSessionToken(sessionToken);
}

/**
 * Generate CSRF token and cookie
 */
export async function generateCSRFToken(): Promise<{ token: string; cookie: string }> {
    const token = await generateToken(32);
    const cookie = buildCookieHeader(CSRF_COOKIE_NAME, token, {
        httpOnly: false,  // Must be readable by JavaScript for forms
        secure: true,
        sameSite: 'Strict'
    });

    return { token, cookie };
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(req: Request): boolean {
    const cookies = parseCookies(req);
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers.get('X-CSRF-Token');

    if (!cookieToken || !headerToken) {
        return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (cookieToken.length !== headerToken.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < cookieToken.length; i++) {
        result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Security headers to include in all responses
 */
export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
};

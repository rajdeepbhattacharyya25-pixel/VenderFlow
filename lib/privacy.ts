/**
 * lib/privacy.ts
 *
 * Provides helpers for redacting or hashing Personally Identifiable Information (PII)
 * before sending data to PostHog or other analytics services.
 */

/**
 * Perform a secure SHA-256 hash on a string (e.g., email or phone number).
 * Useful when an identifier is needed but raw PII cannot be stored.
 */
export async function hashValue(value: string | undefined): Promise<string | undefined> {
    if (!value) return undefined;

    // Convert to lowercase and trim to ensure consistent hashing
    const normalized = value.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);

    if (typeof crypto !== 'undefined' && crypto.subtle) {
        // Browser & Edge environments
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback if subtle crypto is somehow not available
    return 'REDACTED_NO_CRYPTO';
}

/**
 * Filter an object to remove known PII keys (email, phone, name, address, etc.)
 */
export function redactPII(properties: Record<string, unknown>): Record<string, unknown> {
    const piiKeys = ['email', 'phone', 'name', 'address', 'password', 'creditcard', 'ssn', 'dob'];

    const safeProps = { ...properties };

    for (const key of Object.keys(safeProps)) {
        const lowerKey = key.toLowerCase();
        if (piiKeys.some(pii => lowerKey.includes(pii))) {
            safeProps[key] = '[REDACTED]';
        }
    }

    return safeProps;
}

/**
 * Security utilities for password hashing and leak checking.
 */

/**
 * Computes a SHA-1 hash of a string using the browser's subtle crypto API.
 * @param message The string to hash.
 * @returns A promise that resolves to the hex string representation of the hash.
 */
export async function getSHA1(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    return hashHex;
}

/**
 * Checks if a password has been leaked using the Have I Been Pwned (HIBP) API.
 * Uses k-anonymity (sending only the first 5 characters of the SHA-1 hash).
 * @param password The password to check.
 * @returns A promise that resolves to the number of times the password was leaked.
 */
export async function checkPasswordLeak(password: string): Promise<number> {
    if (!password || password.length < 3) return 0;

    try {
        const hash = await getSHA1(password);
        const prefix = hash.substring(0, 5);
        const suffix = hash.substring(5);

        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
        if (!response.ok) {
            console.warn('HIBP API error:', response.statusText);
            return 0;
        }

        const data = await response.text();
        const lines = data.split('\n');

        for (const line of lines) {
            const [localSuffix, count] = line.trim().split(':');
            if (localSuffix === suffix) {
                return parseInt(count, 10);
            }
        }

        return 0;
    } catch (err) {
        console.error('Password leak check failed:', err);
        return 0;
    }
}

/**
 * Heuristic-based password strength analysis.
 * Provides a status and a color category.
 * @param password The password to analyze.
 * @returns The strength level and color.
 */
export function getPasswordStrength(password: string): 'weak' | 'moderate' | 'strong' {
    if (!password) return 'weak';
    if (password.length < 8) return 'weak';

    let score = 0;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return 'weak';
    if (score === 2 || score === 3) return 'moderate';
    return 'strong';
}

/**
 * Utility for generating SHA-256 hashes of files.
 * Used for deduplication in "The Vault" infrastructure.
 */
export async function generateFileHash(file: File): Promise<string> {
    try {
        // SubtleCrypto is only available in Secure Contexts (HTTPS/localhost)
        // On mobile devices accessing via local IP, this will be undefined.
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        }
    } catch (e) {
        console.warn('Crypto API failed, falling back to metadata hash:', e);
    }

    // Fallback: Deterministic "hash" for non-secure contexts (local IP testing)
    // This allows the upload to proceed even if the browser restricts crypto APIs.
    const cleanName = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `lb-${cleanName}-${file.size}-${file.lastModified}`;
}

/**
 * Formats bytes into human readable format
 */
export function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Simple JSON to CSV converter for flat objects
 */
export function jsonToCSV(items: any[]): string {
    if (!items || items.length === 0) return '';
    const replacer = (key: string, value: any) => value === null ? '' : value;
    const header = Object.keys(items[0]);
    const csv = [
        header.join(','), // header row
        ...items.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
    ].join('\r\n');
    return csv;
}

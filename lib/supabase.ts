import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables with explicit casting
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Robust Validation helper
const isInvalidUrl = (url: string | undefined): boolean => {
    if (!url) return true;
    if (url === 'undefined' || url === 'null' || url === '') return true;
    if (url.includes('YOUR_SUPABASE_URL')) return true;
    try {
        const u = new URL(url);
        return !u.protocol.startsWith('http');
    } catch {
        return true;
    }
};

let _supabaseInstance: SupabaseClient | null = null;

/**
 * Lazy initializer for Supabase client.
 * This prevents the app from crashing during module evaluation if env vars are missing.
 */
function getSupabase() {
    if (_supabaseInstance) return _supabaseInstance;

    if (isInvalidUrl(supabaseUrl) || !supabaseAnonKey || supabaseAnonKey === 'undefined') {
        const errorMsg = `[Supabase] Configuration is missing or invalid. URL: ${supabaseUrl || 'EMPTY'}`;
        console.error(errorMsg);
        
        // Return a proxy-based "Mock" client that logs errors when used, instead of throwing here.
        return new Proxy({} as SupabaseClient, {
            get: (_, prop) => {
                throw new Error(`Supabase client is not initialized. Failed to access property: ${String(prop)}. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.`);
            }
        });
    }

    try {
        _supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
        return _supabaseInstance;
    } catch (err) {
        console.error('[Supabase] Fatal error during createClient:', err);
        throw err;
    }
}

// Export a Proxy that lazily resolves to the actual client when accessed.
// This allows top-level imports in other files to succeed without triggering the client creation.
export const supabase = new Proxy({} as SupabaseClient, {
    get: (_, prop) => {
        const instance = getSupabase();
        return (instance as unknown as Record<string | symbol, unknown>)[prop];
    },
    // Handle function calls if the proxy itself is called (though unlikely for supabase client)
    apply: (target, thisArg, argumentsList) => {
        const instance = getSupabase();
        return (instance as unknown as (...args: unknown[]) => unknown).apply(thisArg, argumentsList);
    }
});

/**
 * Wrapper for invoking Edge Functions that require the DISPATCHER_SECRET.
 * Includes a retry mechanism for 401 errors specifically to handle session settling.
 */
export const secureInvoke = async (functionName: string, options: { headers?: Record<string, string>; body?: unknown; [key: string]: unknown } = {}) => {
    const { headers = {}, ...rest } = options;
    const maxRetries = 2;
    let lastError = null;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const result = await supabase.functions.invoke(functionName, {
                ...rest,
                headers: {
                    ...headers,
                    'X-Dispatcher-Secret': import.meta.env.VITE_DISPATCHER_SECRET || '',
                }
            });

            // If we get a 401, it might be the session settling. Retry if it's not the last attempt.
            if (result.error && (result.error as { status?: number }).status === 401 && i < maxRetries) {
                const delay = 300 * (i + 1);
                console.warn(`[Supabase] secureInvoke 401 for ${functionName}, retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            return result;
        } catch (err) {
            lastError = err;
            if (i < maxRetries) {
                await new Promise(r => setTimeout(r, 300));
            }
        }
    }
    throw lastError || new Error(`Failed to invoke ${functionName} after ${maxRetries} retries`);
};

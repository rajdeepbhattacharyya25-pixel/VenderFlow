import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables with explicit casting
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Robust Validation: Catch missing, empty, or placeholder values
const isInvalidUrl = (url: string | undefined): boolean => {
    if (!url) return true;
    if (url === 'undefined' || url === 'null') return true;
    if (url.includes('YOUR_SUPABASE_URL')) return true;
    try {
        new URL(url);
        return false;
    } catch {
        return true;
    }
};

if (isInvalidUrl(supabaseUrl) || !supabaseAnonKey || supabaseAnonKey === 'undefined') {
    const errorMsg = `[Supabase Error] Invalid configuration detected in ${import.meta.env.MODE}. 
    URL: ${supabaseUrl || 'MISSING'}
    Key: ${supabaseAnonKey ? 'PRESENT (Masked)' : 'MISSING'}`;
    
    console.error(errorMsg);
    
    if (typeof window !== 'undefined') {
        (window as any).SUPABASE_CONFIG_ERROR = errorMsg;
    }

    // In production, we log loudly but don't THROW here, to let the app evaluation continue
    // Component level checks or the ErrorBoundary in App.tsx will handle the failure.
}

// Ensure we only call createClient with a valid-looking URL to avoid internal library crashes
const sanitizedUrl = supabaseUrl && !isInvalidUrl(supabaseUrl) 
    ? supabaseUrl 
    : 'https://placeholder.supabase.co'; // Fallback to avoid early crash if we want soft failure

export const supabase = createClient(sanitizedUrl, supabaseAnonKey || '');


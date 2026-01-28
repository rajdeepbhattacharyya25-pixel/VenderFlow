/**
 * Auth Rate Limit Edge Function
 * 
 * Provides rate-limited auth validation for login, signup, and password reset.
 * This function acts as a middleware layer that validates rate limits
 * before forwarding to Supabase Auth.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { applyRateLimit, getClientIP, RATE_LIMITS } from '../_shared/rate-limiter.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AuthRequest {
    action: 'login' | 'signup' | 'password-reset' | 'validate';
    email?: string;
    password?: string;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const body: AuthRequest = await req.json();
        const { action, email } = body;

        if (!action) {
            return new Response(
                JSON.stringify({ error: 'Missing action parameter' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Determine rate limit type based on action
        let rateLimitType: keyof typeof RATE_LIMITS;
        switch (action) {
            case 'login':
                rateLimitType = 'LOGIN';
                break;
            case 'signup':
                rateLimitType = 'SIGNUP';
                break;
            case 'password-reset':
                rateLimitType = 'PASSWORD_RESET';
                break;
            case 'validate':
                rateLimitType = 'DEFAULT';
                break;
            default:
                return new Response(
                    JSON.stringify({ error: 'Invalid action' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
        }

        // Apply rate limiting (by IP + email for auth actions)
        const identifier = email ? email.toLowerCase() : undefined;
        const rateLimitResponse = applyRateLimit(req, `auth-${action}`, rateLimitType, identifier);

        if (rateLimitResponse) {
            console.log(`Rate limit exceeded for ${action} from IP: ${getClientIP(req)}, email: ${email || 'none'}`);
            return rateLimitResponse;
        }

        // Rate limit passed - return success
        // The actual auth operations are still handled by Supabase Auth directly
        // This function validates the rate limit before the frontend calls Supabase
        return new Response(
            JSON.stringify({
                allowed: true,
                action,
                message: 'Rate limit check passed'
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Auth rate limit error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

/**
 * Store Auth Cookie Edge Function
 * 
 * Handles store customer authentication with httpOnly cookies.
 * Provides login, logout, and session validation endpoints.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyRateLimit } from '../_shared/rate-limiter.ts';
import {
    createSessionToken,
    getSessionFromCookies,
    setAuthCookie,
    clearAuthCookie,
    securityHeaders,
    type SessionData
} from '../_shared/cookie-utils.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://venderflow.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
};

interface LoginRequest {
    action: 'login' | 'logout' | 'validate' | 'register' | 'establish_session';
    sellerId?: string;
    sellerSlug?: string;
    email?: string;
    password?: string;
    displayName?: string;
}

/**
 * Hash password using PBKDF2 (matching storeAuth.ts implementation)
 */
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return `${saltHex}:${hashHex}`;
}

/**
 * Verify password against stored hash
 */
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;

    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        256
    );

    const hashArray = new Uint8Array(derivedBits);
    const computedHashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');

    return computedHashHex === hashHex;
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            {
                status: 405,
                headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
            }
        );
    }

    try {
        const body: LoginRequest = await req.json();
        const { action, sellerId, sellerSlug, email, password, displayName } = body;

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // === VALIDATE SESSION ===
        if (action === 'validate') {
            const session = await getSessionFromCookies(req);

            if (!session) {
                return new Response(
                    JSON.stringify({ authenticated: false }),
                    {
                        status: 200,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Verify session is still valid in database
            const { data: customer, error } = await supabase
                .from('store_customers')
                .select('id, email, display_name, status')
                .eq('id', session.customerId)
                .eq('status', 'active')
                .single();

            if (error || !customer) {
                return new Response(
                    JSON.stringify({ authenticated: false }),
                    {
                        status: 200,
                        headers: {
                            ...corsHeaders,
                            ...securityHeaders,
                            'Content-Type': 'application/json',
                            'Set-Cookie': clearAuthCookie()
                        }
                    }
                );
            }

            return new Response(
                JSON.stringify({
                    authenticated: true,
                    customer: {
                        id: customer.id,
                        email: customer.email,
                        displayName: customer.display_name
                    }
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // === ESTABLISH SESSION (OAuth) ===
        if (action === 'establish_session') {
            // Verify the user is authenticated via Supabase Auth (Authorization header)
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return new Response(
                    JSON.stringify({ error: 'Missing authorization header' }),
                    {
                        status: 401,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            const client = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
                global: { headers: { Authorization: authHeader } }
            });

            const { data: { user }, error: userError } = await client.auth.getUser();

            if (userError || !user) {
                return new Response(
                    JSON.stringify({ error: 'Invalid auth token' }),
                    {
                        status: 401,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Find the store customer linked to this user
            const { data: customer, error } = await supabase
                .from('store_customers')
                .select('*')
                .eq('seller_id', sellerId)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .single();

            if (error || !customer) {
                return new Response(
                    JSON.stringify({ error: 'Customer record not found for this store' }),
                    {
                        status: 404,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Create session
            const sessionData: SessionData = {
                customerId: customer.id,
                sellerId: sellerId!,
                sellerSlug: sellerSlug!,
                email: customer.email,
                displayName: customer.display_name,
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
            };

            const sessionToken = await createSessionToken(sessionData);

            return new Response(
                JSON.stringify({
                    success: true,
                    customer: {
                        id: customer.id,
                        email: customer.email,
                        displayName: customer.display_name
                    }
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        ...securityHeaders,
                        'Content-Type': 'application/json',
                        'Set-Cookie': setAuthCookie(sessionToken)
                    }
                }
            );
        }

        // === LOGOUT ===
        if (action === 'logout') {
            return new Response(
                JSON.stringify({ success: true, message: 'Logged out' }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        ...securityHeaders,
                        'Content-Type': 'application/json',
                        'Set-Cookie': clearAuthCookie()
                    }
                }
            );
        }

        // For login and register, we need sellerId, sellerSlug, email, password
        if (!sellerId || !sellerSlug || !email || !password) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        // Apply rate limiting for login/register
        const rateLimitType = action === 'login' ? 'LOGIN' : 'SIGNUP';
        const rateLimitResponse = applyRateLimit(req, `store-auth-${action}`, rateLimitType, email.toLowerCase());
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // === LOGIN ===
        if (action === 'login') {
            const { data: customer, error } = await supabase
                .from('store_customers')
                .select('*')
                .eq('seller_id', sellerId)
                .eq('email', email.toLowerCase())
                .eq('status', 'active')
                .single();

            if (error || !customer) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid email or password.' }),
                    {
                        status: 401,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            if (!customer.password_hash) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Account does not have a password set.' }),
                    {
                        status: 401,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            const isValid = await verifyPassword(password, customer.password_hash);
            if (!isValid) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid email or password.' }),
                    {
                        status: 401,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Update last login
            await supabase
                .from('store_customers')
                .update({ last_login_at: new Date().toISOString() })
                .eq('id', customer.id);

            // Create session
            const sessionData: SessionData = {
                customerId: customer.id,
                sellerId: sellerId,
                sellerSlug: sellerSlug,
                email: customer.email,
                displayName: customer.display_name,
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
            };

            const sessionToken = await createSessionToken(sessionData);

            return new Response(
                JSON.stringify({
                    success: true,
                    customer: {
                        id: customer.id,
                        email: customer.email,
                        displayName: customer.display_name
                    }
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        ...securityHeaders,
                        'Content-Type': 'application/json',
                        'Set-Cookie': setAuthCookie(sessionToken)
                    }
                }
            );
        }

        // === REGISTER ===
        if (action === 'register') {
            // Check if customer already exists
            const { data: existing } = await supabase
                .from('store_customers')
                .select('id')
                .eq('seller_id', sellerId)
                .eq('email', email.toLowerCase())
                .single();

            if (existing) {
                return new Response(
                    JSON.stringify({ success: false, error: 'An account with this email already exists.' }),
                    {
                        status: 400,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Hash password
            const passwordHash = await hashPassword(password);

            // Create customer
            const { data: newCustomer, error } = await supabase
                .from('store_customers')
                .insert({
                    seller_id: sellerId,
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    display_name: displayName || email.split('@')[0],
                    status: 'active'
                })
                .select()
                .single();

            if (error) {
                console.error('Registration error:', error);
                return new Response(
                    JSON.stringify({ success: false, error: 'Failed to create account.' }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
                    }
                );
            }

            // Create session
            const sessionData: SessionData = {
                customerId: newCustomer.id,
                sellerId: sellerId,
                sellerSlug: sellerSlug,
                email: newCustomer.email,
                displayName: newCustomer.display_name,
                expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
            };

            const sessionToken = await createSessionToken(sessionData);

            return new Response(
                JSON.stringify({
                    success: true,
                    customer: {
                        id: newCustomer.id,
                        email: newCustomer.email,
                        displayName: newCustomer.display_name
                    }
                }),
                {
                    status: 200,
                    headers: {
                        ...corsHeaders,
                        ...securityHeaders,
                        'Content-Type': 'application/json',
                        'Set-Cookie': setAuthCookie(sessionToken)
                    }
                }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action' }),
            {
                status: 400,
                headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('Store auth cookie error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            {
                status: 500,
                headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});

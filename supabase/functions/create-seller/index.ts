// Supabase Edge Function: create-seller
// Deploy with: supabase functions deploy create-seller

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyRateLimit } from '../_shared/rate-limiter.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Apply rate limiting (DEFAULT level - 20 requests per minute)
    const rateLimitResponse = applyRateLimit(req, 'create-seller', 'DEFAULT');
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
        // Get auth token from request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const posthogApiKey = Deno.env.get('POSTHOG_API_KEY')!
        const posthogHost = Deno.env.get('POSTHOG_HOST') || 'https://app.posthog.com'

        const userClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        })

        // Verify authenticated user
        const { data: { user }, error: userError } = await userClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const { store_name, slug: rawSlug, client_request_id, utm } = await req.json()

        if (!store_name) {
            return new Response(
                JSON.stringify({ error: 'Missing required field: store_name' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const clientReqId = client_request_id || crypto.randomUUID()
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        // 1. Idempotency Check
        const { data: existingReq } = await adminClient
            .from('seller_requests')
            .select('seller_id, status')
            .eq('client_request_id', clientReqId)
            .maybeSingle()

        if (existingReq) {
            if (existingReq.status === 'created' || existingReq.status === 'exists') {
                const { data: seller } = await adminClient
                    .from('sellers')
                    .select('*')
                    .eq('id', existingReq.seller_id)
                    .single()

                return new Response(
                    JSON.stringify({
                        success: true,
                        data: seller,
                        created: existingReq.status === 'created',
                        idempotent: true
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }
        } else {
            // Log the request initiation
            await adminClient.from('seller_requests').insert({
                client_request_id: clientReqId,
                user_id: user.id,
                status: 'pending',
                metadata: { store_name, slug: rawSlug, utm }
            })
        }

        // 2. Atomic Creation via RPC
        const slug = (rawSlug || store_name).toLowerCase().replace(/[^a-z0-9-]/g, '')

        const { data: rpcResult, error: rpcError } = await adminClient.rpc('create_seller_if_not_exists', {
            p_user_id: user.id,
            p_store_name: store_name,
            p_slug: slug,
            p_created_by: user.id
        })

        if (rpcError) {
            console.error('RPC Error:', rpcError);
            return new Response(
                JSON.stringify({ error: rpcError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // RPC returns a list since it's a RETURNS TABLE function
        const seller = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
        const isNew = seller.was_created;

        // 3. Update Request Status
        await adminClient
            .from('seller_requests')
            .update({
                seller_id: seller.id,
                status: isNew ? 'created' : 'exists'
            })
            .eq('client_request_id', clientReqId)

        // 4. Update user role
        await adminClient
            .from('profiles')
            .update({ role: 'seller' })
            .eq('id', user.id)

        // 5. Fire Analytics Server-Side (Only if new)
        if (isNew && posthogApiKey) {
            try {
                await fetch(`${posthogHost}/capture/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        api_key: posthogApiKey,
                        event: 'store_created',
                        distinct_id: user.id,
                        properties: {
                            seller_id: seller.id,
                            user_id: user.id,
                            slug: seller.slug,
                            store_name: seller.store_name,
                            client_request_id: clientReqId,
                            plan: 'free',
                            ...utm
                        }
                    })
                })
            } catch (phError) {
                console.error('PostHog Capture Error:', phError);
                // Non-blocking
            }
        }

        // 6. Audit Log
        await adminClient.from('audit_logs').insert({
            actor_id: user.id,
            action: 'store_created',
            target_type: 'seller',
            target_id: seller.id,
            metadata: { store_name, slug: seller.slug, client_request_id: clientReqId }
        })

        return new Response(
            JSON.stringify({
                success: true,
                data: seller,
                created: isNew
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Supabase Edge Function: invite-seller
// Deploy with: supabase functions deploy invite-seller

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyRateLimit } from '../_shared/rate-limiter.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Apply rate limiting (ADMIN level - 10 requests per minute)
    const rateLimitResponse = applyRateLimit(req, 'invite-seller', 'ADMIN');
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

        // Create Supabase client with user's token
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const userClient = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        })

        // Verify caller is admin
        const { data: { user }, error: userError } = await userClient.auth.getUser()
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const { data: profile } = await userClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request body
        const { email, store_name, slug, plan } = await req.json()

        if (!email || !store_name || !slug) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: email, store_name, slug' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Use service role client for admin operations
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        // Invite user by email
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
                store_name,
                slug,
                plan: plan || 'free',
                role: 'seller'
            }
        })

        if (inviteError) {
            return new Response(
                JSON.stringify({ error: inviteError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const newUserId = inviteData.user.id

        // Create profile for the new user
        await adminClient.from('profiles').insert({
            id: newUserId,
            role: 'seller',
            full_name: store_name
        })

        // Create seller record
        await adminClient.from('sellers').insert({
            id: newUserId,
            store_name,
            slug,
            plan: plan || 'free',
            status: 'pending',
            is_active: false
        })

        // Log the action
        await adminClient.from('audit_logs').insert({
            actor_id: user.id,
            action: 'seller_invited',
            target_type: 'seller',
            target_id: newUserId,
            metadata: { email, store_name, slug, plan }
        })

        return new Response(
            JSON.stringify({ success: true, sellerId: newUserId }),
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

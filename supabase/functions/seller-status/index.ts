// Supabase Edge Function: seller-status
// Deploy with: supabase functions deploy seller-status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyRateLimit } from '../_shared/rate-limiter.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://venderflow.vercel.app',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Apply rate limiting (ADMIN level - 10 requests per minute)
    const rateLimitResponse = applyRateLimit(req, 'seller-status', 'ADMIN');
    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    try {
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

        const { sellerId, status } = await req.json()

        if (!sellerId || !status) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: sellerId, status' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!['active', 'suspended', 'pending'].includes(status)) {
            return new Response(
                JSON.stringify({ error: 'Invalid status. Must be: active, suspended, or pending' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        // Get seller info for logging
        const { data: seller } = await adminClient
            .from('sellers')
            .select('store_name')
            .eq('id', sellerId)
            .single()

        // Update seller status
        const { error: updateError } = await adminClient
            .from('sellers')
            .update({
                status,
                is_active: status === 'active',
                updated_at: new Date().toISOString()
            })
            .eq('id', sellerId)

        if (updateError) {
            return new Response(
                JSON.stringify({ error: updateError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Log the action
        await adminClient.from('audit_logs').insert({
            actor_id: user.id,
            action: status === 'suspended' ? 'seller_suspended' : 'seller_activated',
            target_type: 'seller',
            target_id: sellerId,
            metadata: { store_name: seller?.store_name, new_status: status }
        })

        return new Response(
            JSON.stringify({ success: true }),
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

// Supabase Edge Function: list-sellers
// Deploy with: supabase functions deploy list-sellers

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
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

        // Parse query parameters
        const url = new URL(req.url)
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '25')
        const search = url.searchParams.get('search') || ''
        const status = url.searchParams.get('status') || ''
        const plan = url.searchParams.get('plan') || ''

        // Build query
        let query = userClient
            .from('sellers')
            .select('*', { count: 'exact' })

        if (search) {
            query = query.or(`store_name.ilike.%${search}%,slug.ilike.%${search}%`)
        }

        if (status) {
            query = query.eq('status', status)
        }

        if (plan) {
            query = query.eq('plan', plan)
        }

        const from = (page - 1) * limit
        const to = from + limit - 1

        const { data: sellers, count, error: queryError } = await query
            .order('created_at', { ascending: false })
            .range(from, to)

        if (queryError) {
            return new Response(
                JSON.stringify({ error: queryError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({
                sellers: sellers || [],
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
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

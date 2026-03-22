
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, sentry-trace, baggage, x-sentry-auth',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('Missing authorization header')
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        })

        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        const { device_info } = await req.json()
        const userAgent = req.headers.get('user-agent') || 'Unknown'
        // IP is in 'x-forwarded-for' header when running on Supabase Edge Functions
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'Unknown'

        // Enrich location data if possible (simplified for now, ideally use a geo-ip service)
        // For now we just store the IP

        const { data, error } = await supabase
            .from('user_sessions')
            .insert({
                user_id: user.id,
                device_info: device_info || userAgent,
                ip_address: ip,
                ua_string: userAgent,
                last_active: new Date().toISOString()
            })
            .select()
            .single()

        if (error) throw error

        return new Response(
            JSON.stringify({ success: true, session_id: data.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

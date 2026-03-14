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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        const targetEmails = [
            'rajdeep.bhattacharyya25@gmail.com',
            'rd.bhatt.official@gmail.com',
            'rajdeepbhattacharya.slsn9a@gmail.com'
        ]

        // Get user IDs by email
        const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers()
        if (authError) throw authError

        const results = []

        for (const user of users) {
            if (targetEmails.includes(user.email)) {
                // Get profile
                const { data: profile } = await adminClient
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                results.push({
                    id: user.id,
                    email: user.email,
                    auth_providers: user.app_metadata.providers,
                    profile_role: profile?.role,
                    profile_exists: !!profile
                })
            }
        }

        return new Response(JSON.stringify({ success: true, results }, null, 2), { headers: corsHeaders })
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Error occurred' }),
            { status: 500, headers: corsHeaders }
        )
    }
})

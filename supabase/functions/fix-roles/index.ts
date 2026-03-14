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

        const rolesToSet = {
            'rajdeep.bhattacharyya25@gmail.com': 'admin',
            'rd.bhatt.official@gmail.com': 'seller',
            'rajdeepbhattacharya.slsn9a@gmail.com': 'customer'
        }

        // Get user IDs by email
        const { data: { users }, error: authError } = await adminClient.auth.admin.listUsers()
        if (authError) throw authError

        const results = []

        for (const user of users) {
            const targetRole = rolesToSet[user.email as keyof typeof rolesToSet]
            if (targetRole) {
                const { error: updateError } = await adminClient
                    .from('profiles')
                    .update({ role: targetRole })
                    .eq('id', user.id)

                if (updateError) {
                    results.push({ email: user.email, success: false, error: updateError.message })
                } else {
                    results.push({ email: user.email, role_set: targetRole, success: true })
                }
            }
        }

        return new Response(JSON.stringify({ success: true, results }), { headers: corsHeaders })
    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message || 'Error occurred' }),
            { status: 500, headers: corsHeaders }
        )
    }
})

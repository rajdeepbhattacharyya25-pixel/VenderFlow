import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
        if (!BREVO_API_KEY) {
            throw new Error("Missing BREVO_API_KEY");
        }

        // Fetch account info from Brevo
        const res = await fetch("https://api.brevo.com/v3/account", {
            headers: {
                "api-key": BREVO_API_KEY,
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(`Brevo API Error: ${JSON.stringify(err)}`);
        }

        const data = await res.json();
        
        // Fetch senders info from Brevo
        const sendersRes = await fetch("https://api.brevo.com/v3/senders", {
            headers: {
                "api-key": BREVO_API_KEY,
                "Accept": "application/json"
            }
        });
        
        let senders = [];
        if (sendersRes.ok) {
            const sendersData = await sendersRes.json();
            senders = sendersData.senders || [];
        }

        console.log("Brevo Account Data:", JSON.stringify(data));
        console.log("Brevo Senders:", JSON.stringify(senders));
        
        return new Response(JSON.stringify({
            email: data.email,
            plan: data.plan,
            senders: senders.map((s: any) => ({ email: s.email, name: s.name, active: s.active })),
            relay: data.relay,
            marketing_automation: data.marketingAutomation
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
})

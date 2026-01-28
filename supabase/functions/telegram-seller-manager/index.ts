import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Auth Check (Must be logged in)
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        // Create client with user context for RLS
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            throw new Error("Unauthorized");
        }

        const { action, bot_token } = await req.json();

        // Init Service Client for Admin Actions
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        if (action === 'connect_bot') {
            if (!bot_token) throw new Error("Bot token is required");

            // A. Validate Token with Telegram
            const getMeRes = await fetch(`https://api.telegram.org/bot${bot_token}/getMe`);
            const getMeData = await getMeRes.json();

            if (!getMeData.ok) {
                throw new Error(`Invalid Bot Token: ${getMeData.description}`);
            }

            const botInfo = getMeData.result; // { id, first_name, username }

            // B. Generate Webhook Secret and UR
            // We use the 'telegram-seller-webhook' function
            // Note: Project URL is needed. 'supabaseUrl' usually is https://<ref>.supabase.co
            // Function URL is usually https://<ref>.supabase.co/functions/v1/telegram-seller-webhook
            const functionUrl = `${supabaseUrl}/functions/v1/telegram-seller-webhook`;
            const webhookSecret = crypto.randomUUID();
            const configId = crypto.randomUUID(); // Predetermine ID to pass in URL

            // C. Set Webhook
            // We pass 'config_id' in URL query params so the webhook knows which seller config to load
            const setWebhookRes = await fetch(`https://api.telegram.org/bot${bot_token}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `${functionUrl}?config_id=${configId}`,
                    secret_token: webhookSecret,
                    allowed_updates: ['message', 'callback_query']
                })
            });

            const setWebhookData = await setWebhookRes.json();
            if (!setWebhookData.ok) {
                throw new Error(`Failed to set Webhook: ${setWebhookData.description}`);
            }

            // D. Save to DB
            // Using upsert based on seller_id (unique)
            const { error: dbError } = await supabaseAdmin
                .from('seller_telegram_configs')
                .upsert({
                    id: configId, // Use the ID we generated
                    seller_id: user.id,
                    bot_token: bot_token,
                    bot_username: botInfo.username,
                    bot_id: botInfo.id,
                    webhook_secret: webhookSecret,
                    is_active: true
                }, { onConflict: 'seller_id' });

            if (dbError) throw dbError;

            return new Response(JSON.stringify({
                success: true,
                bot: {
                    username: botInfo.username,
                    first_name: botInfo.first_name
                },
                connect_token: configId // We can use configId as the 'start' payload too for simplicity or generate a separate one
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error(`Unknown action: ${action}`);

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

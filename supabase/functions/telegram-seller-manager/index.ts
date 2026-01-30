import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

        const token = authHeader.replace('Bearer ', '');

        // Create client with user context for RLS
        const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Explicitly pass token to getUser to avoid 'Auth session missing' in stateless environment
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser(token);

        if (authError) {
            throw new Error(`Auth Error: ${authError.message}`);
        }
        if (!user) {
            throw new Error("Auth Error: No user found for this token");
        }

        const { action, bot_token, app_url } = await req.json();

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

            // C.1. Set Webhook
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

            // C.2. Set Chat Menu Button (Magic Feature)
            // This automatically adds the "Open Dashboard" button to the user's bot
            const finalAppUrl = app_url || Deno.env.get("PUBLIC_APP_URL") || "https://venderflow.vercel.app";

            console.log("Setting Menu Button URL to:", finalAppUrl);

            await fetch(`https://api.telegram.org/bot${bot_token}/setChatMenuButton`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menu_button: {
                        type: "web_app",
                        text: "Dashboard",
                        web_app: {
                            url: `${finalAppUrl}/dashboard`
                        }
                    }
                })
            });

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

        if (action === 'test_notification') {
            // Fetch Config
            const { data: config, error: configError } = await supabaseAdmin
                .from('seller_telegram_configs')
                .select('*')
                .eq('seller_id', user.id)
                .single();

            if (configError || !config) {
                throw new Error("Configuration not found. Please connect your bot first.");
            }

            if (!config.chat_id) {
                throw new Error("Chat ID missing. Please start the bot in Telegram first.");
            }

            // Send Message
            const message = `🔔 **Test Notification**\n\nThis is a test message from your VenderFlow dashboard.\n\nTime: ${new Date().toLocaleString()}`;

            const sendRes = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.chat_id,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });

            const sendData = await sendRes.json();

            if (!sendData.ok) {
                throw new Error(`Telegram API Error: ${sendData.description}`);
            }

            return new Response(JSON.stringify({ success: true }), {
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

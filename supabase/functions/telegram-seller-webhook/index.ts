import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
    // Webhook listener - No CORS needed usually as it's server-to-server, but harmless

    // 1. Get Params
    const url = new URL(req.url);
    const configId = url.searchParams.get('config_id');
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');

    if (!configId) {
        return new Response("Missing config_id", { status: 400 });
    }

    // 2. Initialize Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch Config & Verify Secret
    const { data: config, error } = await supabase
        .from('seller_telegram_configs')
        .select('*')
        .eq('id', configId)
        .single();

    if (error || !config) {
        return new Response("Config not found", { status: 404 });
    }

    if (config.webhook_secret !== secretToken) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const update = await req.json();

        // 4. Handle Content
        if (update.message) {
            await handleMessage(update.message, config, supabase);
        }

        return new Response("OK", { status: 200 });

    } catch (err) {
        console.error("Webhook Error:", err);
        return new Response("Error", { status: 500 });
    }
});

async function handleMessage(message: any, config: any, supabase: any) {
    const chatId = message.chat.id;
    const text = message.text;

    // A. Connect (Start)
    if (text?.startsWith('/start')) {
        // payload logic: /start <payload>
        // Check if payload matches configId (simple validation)
        const parts = text.split(' ');
        if (parts.length > 1) {
            const payload = parts[1];
            if (payload === config.id) {
                // Save Chat ID
                await supabase
                    .from('seller_telegram_configs')
                    .update({ chat_id: chatId })
                    .eq('id', config.id);

                await sendMessage(config.bot_token, chatId, `✅ **Connected Successfully!**\n\nYour store *${config.bot_username || 'Bot'}* is now linked.\nYou will receive notifications here.`);
                return;
            }
        }
        await sendMessage(config.bot_token, chatId, "👋 Welcome! Please use the 'Connect' button in your Seller Dashboard to link this chat.");
    }

    // B. Login
    else if (text === '/login') {
        if (!config.seller_id) return;

        // Generate Magic Link
        // We need the seller's email.
        const { data: user } = await supabase.auth.admin.getUserById(config.seller_id);
        if (user && user.user) {
            const { data: linkData } = await supabase.auth.admin.generateLink({
                type: 'magiclink',
                email: user.user.email
            });
            const link = linkData?.properties?.action_link;

            // Redirect fix (similar to previous solution)
            const SITE_URL = Deno.env.get("SITE_URL") ?? 'https://e-commerce-landing-page-eight-self.vercel.app'; // Default fallback
            const finalLink = link // + redirect logic if needed

            await sendMessage(config.bot_token, chatId, `🔐 **Dashboard Access**\n\n[Click here to login](${finalLink})`);
        } else {
            await sendMessage(config.bot_token, chatId, "❌ Could not find your user account.");
        }
    }

    // C. Default
    else {
        await sendMessage(config.bot_token, chatId, "Available commands:\n/login - Get a login link");
    }
}

async function sendMessage(token: string, chatId: number, text: string) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });
}

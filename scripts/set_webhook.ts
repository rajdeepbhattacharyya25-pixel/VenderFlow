
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("🔄 Registering Telegram Webhook...");

const BOT_TOKEN = "8200605396:AAHiBrmO2FbmaWitwtXmraRy1frcObjPjJg";
const PROJECT_REF = "gqwgvhxcssooxbmwgiwt";
const FUNCTION_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/telegram-webhook`;

async function registerWebhook() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${FUNCTION_URL}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Response:", data);

        if (data.ok) {
            console.log("✅ Webhook successfully registered to:", FUNCTION_URL);
        } else {
            console.error("❌ Failed to register webhook:", data.description);
        }
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

registerWebhook();

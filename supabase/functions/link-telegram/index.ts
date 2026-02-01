import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { initData } = await req.json();

        if (!initData) {
            throw new Error("Missing initData");
        }

        // 1. Verify Telegram Data Integrity
        const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
        if (!BOT_TOKEN) throw new Error("Server Misconfiguration: Missing Bot Token");

        // Parse query string
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');

        if (!hash) throw new Error("Invalid Data: Missing hash");

        urlParams.delete('hash');

        // Sort keys alphabetically
        const dataCheckArr = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        // HMacSHA256(dataCheckString, secretKey)
        // Secret key is HMacSHA256(botToken, "WebAppData")

        // Deno Crypto API usage
        const encoder = new TextEncoder();
        const secretKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode("WebAppData"),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const secretKeyBytes = await crypto.subtle.sign(
            "HMAC",
            secretKey,
            encoder.encode(BOT_TOKEN)
        );

        // Now stick that secret key into a format we can use for the next sign
        const signingKey = await crypto.subtle.importKey(
            "raw",
            secretKeyBytes,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
        );

        const signature = await crypto.subtle.sign(
            "HMAC",
            signingKey,
            encoder.encode(dataCheckString)
        );

        // Convert signature to hex string
        const signatureArray = Array.from(new Uint8Array(signature));
        const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (signatureHex !== hash) {
            throw new Error("Data Integrity Check Failed");
        }

        // 2. Validate Expiration (Prevent Replay Attacks)
        const authDate = parseInt(urlParams.get('auth_date') || '0');
        const now = Math.floor(Date.now() / 1000);

        // Check if data is older than 24 hours (86400 seconds)
        if (now - authDate > 86400) {
            throw new Error("Data Expired");
        }

        // Data is valid. Parse user.
        const userStr = urlParams.get('user');
        if (!userStr) throw new Error("Missing user data");
        const telegramUser = JSON.parse(userStr);

        // 2. Helper Authentication (User must be logged in to Supabase to link)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authUser) throw new Error("Unauthorized: You must be logged in to link an account.");

        // 3. Perform Link
        // We use Admin client to ensure we can update the profile even if some RLS is strict (though user should be able to update own profile)
        // But let's use supabaseClient first.
        const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
                telegram_id: telegramUser.id,
                telegram_username: telegramUser.username,
                telegram_photo_url: telegramUser.photo_url
            })
            .eq('id', authUser.id);

        if (updateError) throw updateError;

        return new Response(JSON.stringify({ success: true, telegram_id: telegramUser.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Link Telegram Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});

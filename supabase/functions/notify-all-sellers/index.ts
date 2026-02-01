// Supabase Edge Function: notify-all-sellers
// Deploy with: supabase functions deploy notify-all-sellers

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!TELEGRAM_BOT_TOKEN) {
            throw new Error("Missing Telegram Configuration");
        }

        const { type, message, status } = await req.json();

        // 1. Authenticate Request (Must be Admin)
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error("Missing Authorization Header");
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const { data: { user }, error: userError } = await userClient.auth.getUser();
        if (userError || !user) throw new Error("Unauthorized");

        const { data: profile } = await userClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') throw new Error("Admin Access Required");

        // 2. Prepare Notification Logic
        const adminClient = createClient(supabaseUrl, serviceRoleKey);

        let telegramMessage = "";
        let notificationTitle = "";
        let notificationType = "";

        if (type === 'MAINTENANCE') {
            notificationType = 'system';
            notificationTitle = status ? '🚨 Maintenance Mode Active' : '✅ Maintenance Mode Ended';
            telegramMessage = status
                ? `🚨 *Maintenance Mode Enabled*\n\nThe platform is now in maintenance mode. Access to the storefront is temporarily restricted for customers.\n\n${message || ''}`
                : `✅ *Maintenance Mode Disabled*\n\nThe platform is now live. Storefronts are accessible to customers.\n\n${message || ''}`;
        } else if (type === 'ANNOUNCEMENT') {
            notificationType = 'info';
            notificationTitle = '📢 Global Announcement';
            telegramMessage = `📢 *Announcement*\n\n${message}`;
        } else {
            throw new Error("Invalid Notification Type");
        }

        // 3. Fetch All Sellers with Telegram Config
        // Note: For large scale, we should batch this or use a queue.
        // For now, fetching all is acceptable given typical invite-only seller count.
        const { data: telegramConfigs } = await adminClient
            .from('seller_telegram_configs')
            .select('user_id, chat_id, is_active')
            .eq('is_active', true);

        // 4. Send Telegram Messages
        const telegramPromises = (telegramConfigs || []).map(async (config) => {
            try {
                await fetch(
                    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: config.chat_id,
                            text: telegramMessage,
                        }),
                    }
                );
            } catch (err) {
                console.error(`Failed to notify seller ${config.user_id}:`, err);
            }
        });

        // 5. Create Dashboard Notifications (For ALL sellers, not just Telegram ones)
        const { data: allSellers } = await adminClient
            .from('sellers')
            .select('id');

        const notificationPromises = (allSellers || []).map(async (seller) => {
            // Avoid spamming if same message sent recently?
            // For maintenance toggle, it's rare event, so always send.
            await adminClient.from('notifications').insert({
                user_id: seller.id,
                type: notificationType,
                title: notificationTitle,
                message: message || notificationTitle,
                is_read: false
            });
        });

        // Execute all promises
        await Promise.all([...telegramPromises, ...notificationPromises]);

        return new Response(JSON.stringify({ success: true, count: telegramConfigs?.length }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

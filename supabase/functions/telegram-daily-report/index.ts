import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fetch Supabase Data (Last 7 Days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // New Sellers
        const { count: newSellersCount, error: sellersError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo);

        if (sellersError) console.error("Sellers Fetch Error:", sellersError);

        // New Orders and GMV
        const { data: newOrders, error: ordersError } = await supabase
            .from('orders')
            .select('total')
            .gte('created_at', sevenDaysAgo);

        if (ordersError) console.error("Orders Fetch Error:", ordersError);

        const totalOrders = newOrders?.length || 0;
        const gmv = newOrders?.reduce((sum, order) => sum + (Number(order.total) || 0), 0) || 0;

        // 2. Fetch PostHog Data (Last 7 Days Unique Visitors)
        const posthogProjectId = Deno.env.get('POSTHOG_PROJECT_ID');
        const posthogApiKey = Deno.env.get('POSTHOG_PERSONAL_API_KEY');

        let uniqueVisitors = "Unavailable";

        if (posthogProjectId && posthogApiKey) {
            try {
                const query = {
                    kind: "HogQLQuery",
                    query: "select count(distinct distinct_id) from events where event = '$pageview' and timestamp > now() - interval 7 day"
                };

                const phResponse = await fetch(`https://app.posthog.com/api/projects/${posthogProjectId}/query/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${posthogApiKey}`
                    },
                    body: JSON.stringify({ query })
                });

                if (phResponse.ok) {
                    const phData = await phResponse.json();
                    uniqueVisitors = phData.results?.[0]?.[0]?.toString() || "0";
                } else {
                    console.error("PostHog API Error:", await phResponse.text());
                }
            } catch (err) {
                console.error("Posthog Data Fetch Exception:", err);
            }
        }

        // 3. Format Telegram Message
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
        const chatId = Deno.env.get('TELEGRAM_CHAT_ID');

        if (!botToken || !chatId) {
            throw new Error('Telegram credentials missing in environment');
        }

        const message = `📊 *VendorFlow Weekly Report*
_Last 7 Days Summary_

👁️ *Landing Traffic:* ${uniqueVisitors} unique visitors
🏪 *New Sellers:* ${newSellersCount || 0}
🛍️ *Orders Placed:* ${totalOrders}
💰 *Total GMV:* ₹${gmv.toFixed(2)}`;

        // 4. Send Message via Telegram API
        const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: "Markdown"
            })
        });

        if (!tgResponse.ok) {
            const tgErr = await tgResponse.text();
            throw new Error(`Telegram API Error: ${tgErr}`);
        }

        return new Response(JSON.stringify({ success: true, message: "Report sent successfully" }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
});

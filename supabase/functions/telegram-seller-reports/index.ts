import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        // 1. Fetch all sellers with active Telegram configs
        const { data: configs, error: configErr } = await supabase
            .from('seller_telegram_configs')
            .select('*')
            .eq('is_active', true)
            .not('chat_id', 'is', null);

        if (configErr) {
            console.error("Config Fetch Error:", configErr);
            return new Response(JSON.stringify({ error: configErr.message }), { status: 500 });
        }

        // Fetch store names for all relevant sellers
        const sellerIds = configs.map(c => c.seller_id);
        const { data: sellersData } = await supabase
            .from('sellers')
            .select('id, store_name')
            .in('id', sellerIds);
        
        const storeNameMap = Object.fromEntries(sellersData?.map(s => [s.id, s.store_name]) || []);


        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const results = [];

        for (const config of configs) {
            // Check preference (default to true if key exists but is not false)
            const isEnabled = config.preferences?.daily_summary !== false;
            if (!isEnabled) continue;

            // 2. Fetch Stats
            const [{ data: orders }, { count: visitors }] = await Promise.all([
                supabase
                    .from('orders')
                    .select('total')
                    .eq('seller_id', config.seller_id)
                    .gte('created_at', yesterday),
                supabase
                    .from('store_page_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('seller_id', config.seller_id)
                    .gte('created_at', yesterday)
            ]);

            const totalRevenue = orders?.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0) || 0;
            const totalOrders = orders?.length || 0;

            // 3. Format & Send Message
            const storeName = storeNameMap[config.seller_id] || "Your Store";
            const message = `📈 <b>Daily Performance Summary</b>\n` +
                `<i>Last 24 Hours for ${storeName}</i>\n\n` +
                `💰 Revenue: <b>₹${totalRevenue.toFixed(2)}</b>\n` +
                `📦 New Orders: <b>${totalOrders}</b>\n` +
                `👥 Store Visitors: <b>${visitors || 0}</b>\n\n` +
                `<a href="${Deno.env.get('SITE_URL') || 'https://vendorflow.vercel.app'}/dashboard">🔗 Open Full Dashboard</a>`;


            const res = await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.chat_id,
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            results.push({ seller_id: config.seller_id, success: res.ok });
        }

        return new Response(JSON.stringify({ success: true, processed: results }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Critical Error in Daily Report:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
});

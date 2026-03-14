import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

serve(async (req) => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log("🚀 Starting Recovery Cron Job...");

    // 1. Define window for abandoned carts (1 hour to 24 hours ago)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 2. Fetch cart items with customer and store details
    // Using a raw query or joining tables
    const { data: candidates, error: fetchError } = await supabase
        .from('store_cart_items')
        .select(`
            customer_id,
            seller_id,
            updated_at,
            store_customers!inner (
                email,
                display_name
            )
        `)
        .lt('updated_at', oneHourAgo)
        .gt('updated_at', twentyFourHoursAgo);

    if (fetchError) {
        console.error("❌ Error fetching cart candidates:", fetchError);
        return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    console.log(`🔍 Found ${candidates?.length || 0} potential abandoned carts.`);

    const processed = [];

    if (candidates) {
        // De-duplicate candidates by customer_id + seller_id
        const uniqueCandidates = Array.from(new Set(candidates.map(c => `${c.customer_id}:${c.seller_id}`)))
            .map(key => {
                const [cid, sid] = key.split(':');
                return candidates.find(c => c.customer_id === cid && c.seller_id === sid);
            });

        for (const cart of uniqueCandidates) {
            if (!cart) continue;

            try {
                // A. Check for any orders after the cart was last updated
                const { data: recentOrders } = await supabase
                    .from('orders')
                    .select('id')
                    .eq('customer_id', cart.customer_id)
                    .eq('seller_id', cart.seller_id)
                    .gt('created_at', cart.updated_at)
                    .limit(1);

                if (recentOrders && recentOrders.length > 0) {
                    console.log(`ℹ️ Customer ${cart.customer_id} already purchased. Skipping.`);
                    continue;
                }

                // B. Check if recovery email was already sent in the last 24h
                const { data: recentLogs } = await supabase
                    .from('cart_recovery_logs')
                    .select('id')
                    .eq('customer_id', cart.customer_id)
                    .eq('seller_id', cart.seller_id)
                    .gt('sent_at', twentyFourHoursAgo)
                    .limit(1);

                if (recentLogs && recentLogs.length > 0) {
                    console.log(`ℹ️ Recovery email already sent to ${cart.customer_id}. Skipping.`);
                    continue;
                }

                // C. Fetch Store Name
                const { data: storeSettings } = await supabase
                    .from('store_settings')
                    .select('store_name')
                    .eq('seller_id', cart.seller_id)
                    .single();

                const storeName = storeSettings?.store_name || 'Your Store';

                // D. Trigger send-email
                console.log(`📧 Sending recovery email to ${cart.store_customers.email}...`);
                const { data: emailData, error: emailInvokeError } = await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'ABANDONED_CART',
                        recipient_email: cart.store_customers.email,
                        recipient_name: cart.store_customers.display_name,
                        seller_id: cart.seller_id,
                        payload: {
                            customer_id: cart.customer_id,
                            store_name: storeName,
                            recovery_link: `https://${cart.seller_id}.vendorflow.shop/cart`
                        }
                    }
                });

                processed.push({
                    customer_id: cart.customer_id,
                    email: cart.store_customers.email,
                    success: !emailInvokeError,
                    error: emailInvokeError
                });

            } catch (err) {
                console.error(`❌ Failed to process cart for ${cart.customer_id}:`, err.message);
            }
        }
    }

    return new Response(JSON.stringify({ 
        message: "Recovery Cron Completed", 
        total_processed: processed.length, 
        details: processed 
    }), {
        headers: { "Content-Type": "application/json" },
        status: 200
    });
})

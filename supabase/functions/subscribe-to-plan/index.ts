import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RazorpayService } from "../_shared/payments/razorpay.ts";
import { captureServerEvent } from "../_shared/posthog-edge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const RAZORPAY_PLAN_PRO = Deno.env.get("RAZORPAY_PLAN_PRO")!;
const RAZORPAY_PLAN_PREMIUM = Deno.env.get("RAZORPAY_PLAN_PREMIUM")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const razorpay = new RazorpayService(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);

serve(async (req) => {
    try {
        const { plan_name } = await req.json();
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) throw new Error("Authentication failed");

        const planId = plan_name === 'pro' ? RAZORPAY_PLAN_PRO : RAZORPAY_PLAN_PREMIUM;
        if (!planId) throw new Error("Invalid plan selection");

        // Create Razorpay Subscription with trial
        const trialDays = 7;
        const sub = await razorpay.createSubscription(planId, undefined, trialDays);

        // Analytics
        await captureServerEvent(user.id, 'payment_setup_initiated', {
            plan_name,
            external_id: sub.id,
            trial_days: trialDays
        });

        // Store the intent to upgrade (optional, webhook will handle the actual change)
        await supabase.from('usage_quota_events').insert({
            seller_id: user.id,
            event_type: 'subscription_initiated',
            metadata: { plan_name, external_id: sub.id }
        });

        return new Response(JSON.stringify({
            subscription_id: sub.id,
            key_id: RAZORPAY_KEY_ID,
            order_amount: sub.amount / 100 // subscription amount might be 0 during trial
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
});

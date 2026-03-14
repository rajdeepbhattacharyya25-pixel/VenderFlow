import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RazorpayService } from "../_shared/payments/razorpay.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) throw new Error("Authentication failed");

        // 1. Fetch Seller Data
        const { data: seller, error: sellerError } = await supabase
            .from("sellers")
            .select("id, store_name, razorpay_account_id")
            .eq("id", user.id)
            .single();

        if (sellerError || !seller) throw new Error("Seller profile not found");
        if (seller.razorpay_account_id) {
            return new Response(JSON.stringify({ 
                success: true, 
                razorpay_account_id: seller.razorpay_account_id,
                message: "Account already linked" 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Initialize Razorpay
        const rzp = new RazorpayService(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);

        // 3. Create Linked Account
        // Note: Using individual as default, can be extended to handle business types
        const rzpAccount = await rzp.createLinkedAccount({
            email: user.email!,
            name: seller.store_name,
            type: 'route',
            tnc_accepted: true,
            business_type: "individual"
        });

        const accountId = rzpAccount.id;

        // 4. Update Seller Record
        const { error: updateError } = await supabase
            .from("sellers")
            .update({
                razorpay_account_id: accountId,
                payout_status: 'active',
                updated_at: new Date().toISOString()
            })
            .eq("id", user.id);

        if (updateError) throw updateError;

        // 5. Audit Log
        await supabase.from("audit_logs").insert({
            actor_id: user.id,
            action: "razorpay_account_created",
            target_type: "seller",
            target_id: user.id,
            metadata: { razorpay_account_id: accountId }
        });

        return new Response(JSON.stringify({ 
            success: true, 
            razorpay_account_id: accountId 
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("[CreatePayoutAccount]", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

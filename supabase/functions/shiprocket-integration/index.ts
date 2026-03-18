import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Shiprocket Integration Edge Function
 * Handles:
 * 1. Authentication (Token Generation)
 * 2. Order Creation
 * 3. Tracking Lookup
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, orderData } = await req.json();

    if (action === "authenticate") {
      const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: Deno.env.get("SHIPROCKET_EMAIL"),
          password: Deno.env.get("SHIPROCKET_PASSWORD"),
        }),
      });

      const result = await response.json();
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create-order") {
      const token = req.headers.get("X-Shiprocket-Token");
      if (!token) throw new Error("Missing Shiprocket Token");

      const response = await fetch("https://apiv2.shiprocket.in/v1/external/orders/create/adhoc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();
      
      // Shiprocket returns 200 even for some errors, check result.status
      if (!response.ok || result.status === 'error' || result.status_code === 422) {
          throw new Error(result.message || "Shiprocket API Error");
      }

      // If successful, update the order in Supabase
      if (result.order_id && result.shipment_id) {
          const { error } = await supabase
            .from('orders')
            .update({ 
                shipping_id: result.shipment_id.toString(),
                status: 'shipped'
            })
            .eq('id', orderData.order_id);
          
          if (error) console.error("Database update error:", error);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Interakt WhatsApp Notification Function
 * Uses Interakt Track API to send template-based messages.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phoneNumber, customerName, orderId, status, trackingUrl } = await req.json();

    if (!phoneNumber) throw new Error("Missing phone number");

    const INTERAKT_API_KEY = Deno.env.get("INTERAKT_API_KEY");
    if (!INTERAKT_API_KEY) throw new Error("Missing INTERAKT_API_KEY");

    // Template Mapping
    let templateName = "";
    let variables = [customerName, orderId];

    if (status === "confirmed") {
        templateName = "order_confirmed_v1";
    } else if (status === "shipped") {
        templateName = "order_shipped_v1";
        variables.push(trackingUrl || "Not provided");
    }

    if (!templateName) throw new Error(`No template found for status: ${status}`);

    const response = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${INTERAKT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        full_phone_number: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
        template: {
          name: templateName,
          languageCode: "en",
          headerValues: [],
          bodyValues: variables
        }
      }),
    });

    const result = await response.json();

    if (response.ok) {
        // Log success or update order table if needed
        console.log(`WhatsApp Notification Sent to ${phoneNumber} for status ${status}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

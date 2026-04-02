import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Sentry, withSentry } from "../_shared/sentry.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const DISPATCHER_SECRET = (Deno.env.get("DISPATCHER_SECRET") ?? "").trim();

const handler = async (req: Request) => {
  // Guard: validate internal shared secret
  const incomingSecret = (req.headers.get("X-Dispatcher-Secret") ?? "").trim();
  if (DISPATCHER_SECRET && incomingSecret !== DISPATCHER_SECRET) {
    console.error(`Unauthorized: Received ${incomingSecret.length} chars, expected ${DISPATCHER_SECRET.length}`);
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { "Content-Type": "application/json" },
      status: 401,
    });
  }

  // Use service role key for DB operations
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { 
      alert_id, 
      alert_type, 
      severity, 
      seller_id, 
      title, 
      message,
      metadata = {},
      action_type,
      action_payload
    } = await req.json();

    console.log(`Alert received: ${alert_type} (${severity}) - ${title}`);

    // Track every alert in Sentry
    Sentry.captureMessage(`System Alert: ${title} (${severity})`, {
      level: severity === 'emergency' ? 'fatal' : (severity === 'critical' ? 'error' : severity),
      extra: {
        alert_id,
        alert_type,
        message,
        metadata
      }
    });

    // Determine targets
    const isCritical = severity === 'critical' || severity === 'emergency';
    const hasSeller = !!seller_id;

    // 1. Notify Admin (Critical severity only → Telegram)
    if (isCritical) {
      console.log(`Notifying Admin for ${alert_type}`);
      
      // Attempt to get seller email for better context
      let sellerEmail = 'system';
      if (hasSeller) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', seller_id) 
          .single();
        
        if (userData?.email) {
          sellerEmail = userData.email;
        }
      }

      // Call existing notify-admin function
      try {
        const adminNotifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            'X-Dispatcher-Secret': DISPATCHER_SECRET
          },
          body: JSON.stringify({ 
            type: 'SYSTEM_ERROR',
            message: message,
            data: {
              severity: severity,
              error_code: alert_type,
              error_title: title,
              seller_id: seller_id,
              seller_email: sellerEmail,
              alert_id: alert_id
            }
          })
        });
        
        if (!adminNotifyResponse.ok) {
          const errorText = await adminNotifyResponse.text();
          console.error(`Admin notification failed: ${adminNotifyResponse.status} - ${errorText}`);
        } else {
          console.log("Admin notification sent successfully");
        }
      } catch (err) {
        console.error("Failed to call notify-admin:", err);
        Sentry.captureException(err);
      }
    }

    // 2. Notify Seller (if present)
    if (hasSeller) {
      console.log(`Notifying Seller: ${seller_id}`);
      
      // Get user_id for notification table
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('user_id')
        .eq('id', seller_id)
        .single();

      if (sellerError || !seller?.user_id) {
        console.error(`Error finding user_id for seller ${seller_id}:`, sellerError);
      } else {
        // A. Insert Notification for Dashboard UI
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: seller.user_id,
            type: severity === 'info' ? 'info' : (severity === 'warning' ? 'warning' : 'error'),
            title: title,
            message: message,
            metadata: {
              alert_id,
              action_type,
              action_payload,
              severity
            }
          });

        if (notificationError) {
          console.error(`Error inserting notification for seller ${seller_id}:`, notificationError);
          Sentry.captureException(notificationError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Alert dispatcher error:", error);
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
};

serve(withSentry(handler));

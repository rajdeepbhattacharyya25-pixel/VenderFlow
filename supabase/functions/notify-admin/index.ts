import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Sentry, withSentry } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("ADMIN_TELEGRAM_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dispatcher-secret",
};

const handler = async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        const incomingSecret = (req.headers.get("X-Dispatcher-Secret") ?? "").trim();
        const DISPATCHER_SECRET = (Deno.env.get("DISPATCHER_SECRET") ?? "").trim();

        let isAuthorized = false;
        if (DISPATCHER_SECRET && incomingSecret === DISPATCHER_SECRET) {
            isAuthorized = true;
        } else if (authHeader) {
            try {
              const token = authHeader.replace("Bearer ", "");
              const { data: { user }, error: authError } = await supabase.auth.getUser(token);
              if (!authError && user) isAuthorized = true;
            } catch (err) { 
                console.error("JWT Error:", err);
                Sentry.captureException(err);
            }
        }

        if (!isAuthorized) {
            return new Response(JSON.stringify({ code: 401, message: "Unauthorized" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 401,
            });
        }

        const payload = await req.json();
        const { type, message, data } = payload;
        
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            throw new Error("Missing Telegram Configuration");
        }

        const { data: admins, error: adminError } = await supabase
            .from('profiles')
            .select('notification_preferences')
            .eq('role', 'admin');

        if (adminError) {
            Sentry.captureException(adminError);
            throw adminError;
        }

        const typeMap: Record<string, string> = {
            "BACKUP_SUCCESS": "backup_success",
            "BACKUP_FAILED": "backup_failed",
            "NEW_MESSAGE": "new_message",
            "NEW_SELLER_APPLICATION": "new_message",
            "SYSTEM_ALERT": "system_alert",
            "SYSTEM_ERROR": "system_alert",
            "UPLOAD_ERROR": "system_alert",
            "API_KEY_INVALID": "system_alert",
        };

        const prefKey = typeMap[type];
        const isEnabled = admins?.some(admin => admin.notification_preferences?.[prefKey] !== false);

        if (prefKey && !isEnabled) {
            return new Response(JSON.stringify({ skipped: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        let text = "";
        const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        // Using HTML formatting for better stability with underscores
        switch (type) {
            case "BACKUP_SUCCESS":
                text = `✅ <b>Backup Successful</b>\n📅 ${timestamp}\n📂 Type: ${data?.backup_type || "Unknown"}\n👤 User: ${data?.user_email || "System"}`;
                break;
            case "BACKUP_FAILED":
                text = `❌ <b>Backup Failed</b>\n📅 ${timestamp}\n⚠️ Error: ${message}\n👤 User: ${data?.user_email || "System"}`;
                break;
            case "NEW_MESSAGE":
                text = `📩 <b>New Support Message</b>\n👤 From: ${data?.email || "Unknown"}\n📝 Subject: ${data?.subject || "No Subject"}\n🎫 Ticket ID: ${data?.ticket_id}\n-------------------\n${message}`;
                break;
            case "NEW_SELLER_APPLICATION":
                text = `📝 <b>New Seller Application</b>\n🏢 Business: ${data?.business_name || "Unknown"}\n👤 Applicant: ${data?.name || "Unknown"}\n-------------------\n${data?.message || 'No additional message.'}`;
                break;
            case "SYSTEM_ALERT":
                text = `🚨 <b>SYSTEM ALERT</b>\n📅 ${timestamp}\n⚠️ ${message}`;
                break;
            case "SYSTEM_ERROR":
            case "UPLOAD_ERROR":
            case "API_KEY_INVALID": {
                const d = data || {};
                const severityIcon = d.severity === 'warning' ? '⚠️' : '🚨';
                text = `${severityIcon} <b>System Error Detected</b>\n📅 ${timestamp}\n🧰 Code: <code>${d.error_code || 'UNKNOWN'}</code>\n📌 Title: ${d.error_title || message}\n👤 Seller: ${d.seller_email || 'unknown'}\n\n📝 Details:\n${message}`;
                break;
            }
            default:
                text = `🔔 <b>Notification</b>\n${message}`;
        }

        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: text,
                    parse_mode: "HTML",
                }),
            }
        );

        const result = await response.json();
        if (!response.ok) {
            const err = new Error(`Telegram Error: ${result.description}`);
            Sentry.captureException(err);
            throw err;
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error:", error);
        Sentry.captureException(error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
};

serve(withSentry(handler));

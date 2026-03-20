import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
        console.log("📥 Received Notification Request");
        const payload = await req.json();
        const { type, message, data } = payload;
        console.log("Type:", type);

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error("❌ Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
            throw new Error("Missing Telegram Configuration");
        }

        // 1. Fetch Admin Preferences
        console.log("🔍 Fetching admin preferences...");
        const { data: admins, error: adminError } = await supabase
            .from('profiles')
            .select('notification_preferences')
            .eq('role', 'admin');

        if (adminError) {
            console.error("❌ Profile Fetch Error:", adminError);
            throw adminError;
        }

        console.log(`✅ Found ${admins?.length || 0} admins`);

        // 2. Map Type to Preference Key
        const typeMap: Record<string, string> = {
            "BACKUP_SUCCESS": "backup_success",
            "BACKUP_FAILED": "backup_failed",
            "NEW_MESSAGE": "new_message",
            "NEW_SELLER_APPLICATION": "new_message",
            "SYSTEM_ALERT": "system_alert"
        };

        const prefKey = typeMap[type];
        
        // 3. Filter: Send only if at least one admin has this preference enabled 
        // (Since it's a shared group chat)
        const isEnabled = admins?.some(admin => 
            admin.notification_preferences?.[prefKey] !== false
        );

        console.log(`Filtering: type=${type}, prefKey=${prefKey}, isEnabled=${isEnabled}`);

        if (prefKey && !isEnabled) {
            console.log(`🚫 Notification of type ${type} is disabled by admin preferences. Skipping.`);
            return new Response(JSON.stringify({ skipped: true, reason: "disabled_by_preferences" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        let text = "";
        const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

        // Format Message based on Type
        switch (type) {
            case "BACKUP_SUCCESS":
                text = `
✅ *Backup Successful*
📅 ${timestamp}
📂 Type: ${data?.backup_type || "Unknown"}
👤 User: ${data?.user_email || "System"}
`;
                break;

            case "BACKUP_FAILED":
                text = `
❌ *Backup Failed*
📅 ${timestamp}
⚠️ Error: ${message}
👤 User: ${data?.user_email || "System"}
`;
                break;

            case "NEW_MESSAGE":
                let attachmentInfo = "";
                if (data?.attachment_url) {
                    attachmentInfo = `\n\nAttachment: ${data.attachment_name || 'View File'} (${data.attachment_url})`;
                }

                text = `
📩 New Support Message
👤 From: ${data?.email || "Unknown"}
📝 Subject: ${data?.subject || "No Subject"}
🎫 Ticket ID: ${data?.ticket_id}
-------------------
${message}${attachmentInfo}
`;
                break;

            case "NEW_SELLER_APPLICATION":
                text = `
📝 *New Seller Application*
🏢 Business: ${data?.business_name || "Unknown"}
👤 Applicant: ${data?.name || "Unknown"}
📍 City: ${data?.city || "Unknown"}
📞 Phone: ${data?.phone || "Unknown"}
📧 Email: ${data?.email || "Unknown"}
🏷️ Category: ${data?.category || "Unknown"}
🌐 Online Setup: ${data?.is_selling_online ? 'Yes' : 'No'}
📈 Est. Sales: ${data?.monthly_sales_range || 'N/A'}
📱 Instagram: ${data?.instagram || 'None'}
-------------------
${data?.message || 'No additional message.'}
`;
                break;

            case "SYSTEM_ALERT":
                text = `
🚨 SYSTEM ALERT
📅 ${timestamp}
⚠️ ${message}
`;
                break;

            default:
                text = `
🔔 Notification
${message}
`;
        }

        // Send to Telegram
        const response = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: text,
                    // parse_mode removed to avoid errors with special characters in emails/messages
                }),
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error("Telegram API Error:", result);
            throw new Error(`Telegram API Error: ${result.description}`);
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error) {
        console.error("Error in notify-admin:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

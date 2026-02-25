import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get('ALLOWED_ORIGIN') ?? "https://venderflow.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            throw new Error("Missing Telegram Configuration");
        }

        const { type, message, data } = await req.json();

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
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

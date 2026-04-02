import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DISPATCHER_SECRET = (Deno.env.get("DISPATCHER_SECRET") ?? "").trim();
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("ADMIN_TELEGRAM_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const handler = async (req: Request) => {
    console.log("Heartbeat Check Initiated...");

    try {
        // 1. Attempt to call notify-admin to check secret synchronization
        const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Dispatcher-Secret": DISPATCHER_SECRET
            },
            body: JSON.stringify({
                type: "HEARTBEAT",
                message: "Daily secret synchronization check",
                data: {
                    timestamp: new Date().toISOString(),
                    origin: "heartbeat-function"
                }
            })
        });

        if (response.status === 401) {
            console.error("CRITICAL: DISPATCHER_SECRET Mismatch detected during heartbeat!");
            
            // Log to system_alerts table directly via DB client (bypassing dispatcher since secret is wrong)
            const { error: logError } = await supabase
                .from('system_alerts')
                .insert([{
                    type: 'SECRET_DRIFT_DETECTED',
                    severity: 'critical',
                    title: 'Authentication Secret Drift',
                    message: 'The internal DISPATCHER_SECRET has moved out of sync between Edge Functions. This will break critical system notifications.',
                    metadata: {
                        check_type: 'heartbeat',
                        detected_at: new Date().toISOString()
                    }
                }]);

            // 3. EMERGENCY: Direct Telegram Alert (bypass alert-dispatcher)
            const text = `🚨 <b>SECRET DRIFT DETECTED</b>\n📅 ${new Date().toLocaleString()}\n⚠️ Internal DISPATCHER_SECRET is out of sync between heartbeat and notify-admin functions.`;
            
            if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: text,
                        parse_mode: "HTML",
                    }),
                });
            }

            return new Response(JSON.stringify({ status: "drift_detected", code: 401 }), { status: 200 });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.warn(`Heartbeat call failed with status ${response.status}: ${errorText}`);
            return new Response(JSON.stringify({ status: "call_failed", code: response.status }), { status: 200 });
        }

        console.log("Heartbeat Successful: Secrets are synchronized.");

        // Log success to verify cron is healthy (low severity info)
        await supabase.from('system_alerts').insert([{
            type: 'HEARTBEAT_OK',
            severity: 'info',
            title: 'System Heartbeat OK',
            message: 'Verified internal secret synchronization and cross-function connectivity.'
        }]);

        return new Response(JSON.stringify({ status: "success" }), { status: 200 });

    } catch (error) {
        console.error("Heartbeat Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};

serve(handler);

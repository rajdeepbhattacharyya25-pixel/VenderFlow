import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { NotificationService } from "../_shared/notifications/index.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const notificationService = new NotificationService(supabase, BREVO_API_KEY, TELEGRAM_BOT_TOKEN);

serve(async (req) => {
    try {
        // Fetch pending messages from queue
        const { data: queue, error: queueError } = await supabase
            .from('telegram_message_queue')
            .select('*')
            .eq('status', 'pending')
            .lt('retry_count', 5)
            .order('created_at', { ascending: true })
            .limit(10);

        if (queueError) throw queueError;

        const results = [];
        for (const item of queue) {
            const result = await notificationService.send(item.seller_id, item.payload, 'telegram');

            if (result.success) {
                await supabase.from('telegram_message_queue').update({
                    status: 'sent',
                    last_attempt_at: new Date().toISOString(),
                }).eq('id', item.id);
            } else {
                await supabase.from('telegram_message_queue').update({
                    retry_count: item.retry_count + 1,
                    last_attempt_at: new Date().toISOString(),
                    error_log: result.error,
                }).eq('id', item.id);
            }
            results.push({ id: item.id, success: result.success });
        }

        return new Response(JSON.stringify({ processed: results.length, results }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

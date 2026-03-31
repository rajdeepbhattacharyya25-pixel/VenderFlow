import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { NotificationService } from "../_shared/notifications/index.ts";
import { captureServerEvent } from "../_shared/posthog-edge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const notificationService = new NotificationService(supabase, BREVO_API_KEY, TELEGRAM_BOT_TOKEN);

serve(async (req) => {
    try {
        const { gst_number, pan_number, document_urls } = await req.json();
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) return new Response("Unauthorized", { status: 401 });

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) throw new Error("Authentication failed");

        // Analytics
        await captureServerEvent(user.id, 'kyc_submitted', {
            has_gst: !!gst_number,
            has_pan: !!pan_number,
            documents_count: document_urls?.length || 0
        });

        // 1. Update Seller KYC Status
        const kycData = {
            gst_number,
            pan_number,
            document_urls,
            submitted_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
            .from('sellers')
            .update({
                kyc_status: 'pending',
                kyc_data: kycData
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // 2. Notify Admin
        await notificationService.send(user.id, {
            title: "New KYC Submission",
            message: `Seller ${user.id} has submitted KYC data.\nGST: ${gst_number}\nPAN: ${pan_number}`,
            recipient: TELEGRAM_CHAT_ID,
            type: 'info'
        }, 'telegram');

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }
});

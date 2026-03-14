import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RazorpayService } from "../_shared/payments/razorpay.ts";
import { TelegramProvider } from "../_shared/notifications/telegram.ts";

/**
 * Outbox Queue Worker
 * Processes pending outbox jobs (Razorpay transfers, reversals) with retry logic.
 * Should be invoked by a cron job (every 1 minute) or manual trigger.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const ADMIN_TELEGRAM_TOKEN = Deno.env.get("ADMIN_TELEGRAM_TOKEN")!;
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const razorpay = new RazorpayService(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);
const telegram = new TelegramProvider(ADMIN_TELEGRAM_TOKEN);

const MAX_JOBS_PER_RUN = 10;

serve(async (_req) => {
    const results = { processed: 0, succeeded: 0, failed: 0, errors: [] as string[] };

    try {
        for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
            // Claim a job (atomically prevents double-processing)
            const { data: jobs, error: claimError } = await supabase
                .rpc('claim_outbox_job', { p_job_types: ['razorpay_transfer', 'razorpay_reversal'] });

            if (claimError || !jobs || jobs.length === 0) break;
            const job = jobs[0];

            results.processed++;

            try {
                const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

                if (job.job_type === 'razorpay_transfer') {
                    // Check if payout is eligible (Global switch + Seller hold status)
                    const { data: isEligible } = await supabase.rpc('check_payout_eligibility', { 
                        p_seller_id: payload.seller_id 
                    });

                    if (!isEligible) {
                        throw new Error(`Payout currently gated (Global toggle or Seller hold)`);
                    }

                    await processTransfer(payload);
                } else if (job.job_type === 'razorpay_reversal') {
                    await processReversal(payload);
                }

                // Mark completed
                await supabase.rpc('complete_outbox_job', {
                    p_job_id: job.id,
                    p_success: true
                });

                results.succeeded++;
            } catch (jobError: any) {
                const errorMsg = jobError.message || 'Unknown error';

                // Mark failed with retry
                await supabase.rpc('complete_outbox_job', {
                    p_job_id: job.id,
                    p_success: false,
                    p_error: errorMsg
                });

                results.failed++;
                results.errors.push(`Job ${job.id}: ${errorMsg}`);

                // Alert on final failure
                if (job.attempts + 1 >= job.max_retries) {
                    await telegram.sendMessage({
                        recipient: ADMIN_TELEGRAM_CHAT_ID,
                        title: "🚨 Outbox Job Failed Permanently",
                        message: `
Job ID: ${job.id}
Type: ${job.job_type}
Attempts: ${job.attempts + 1}/${job.max_retries}
Error: ${errorMsg}
---
Action Required: Check runbook for 'outbox_failed'.
                        `.trim()
                    }).catch(() => {});

                    // Create system alert
                    await supabase.rpc('create_system_alert', {
                        p_alert_type: 'outbox_failed',
                        p_severity: 'critical',
                        p_title: `Outbox Job Failed: ${job.job_type}`,
                        p_message: errorMsg,
                        p_metadata: JSON.stringify({ job_id: job.id, payload: job.payload })
                    });
                }
            }
        }
    } catch (error: any) {
        console.error("Outbox worker error:", error);
    }

    return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" },
    });
});

// ---------------------------------------------------------------------------
// Process: Razorpay Transfer
// ---------------------------------------------------------------------------
async function processTransfer(payload: any) {
    const { payment_id, razorpay_account_id, amount_paise, order_id, transfer_record_id } = payload;

    if (!payment_id || !razorpay_account_id) {
        throw new Error("Missing payment_id or razorpay_account_id");
    }

    const result = await razorpay.createTransfer(
        payment_id,
        razorpay_account_id,
        amount_paise,
        { order_id: order_id || '' }
    );

    const transferId = result.items?.[0]?.id;

    // Update the transfer record with the Razorpay transfer ID
    if (transfer_record_id && transferId) {
        await supabase
            .from('seller_transfers')
            .update({ razorpay_transfer_id: transferId, status: 'processed' })
            .eq('id', transfer_record_id);
    }

    console.log(`Transfer completed: ${transferId} for ₹${amount_paise / 100}`);
}

// ---------------------------------------------------------------------------
// Process: Razorpay Reversal
// ---------------------------------------------------------------------------
async function processReversal(payload: any) {
    const { transfer_id, amount_paise } = payload;

    if (!transfer_id) {
        throw new Error("Missing transfer_id for reversal");
    }

    await razorpay.reverseTransfer(transfer_id, amount_paise);
    console.log(`Reversal completed: ${transfer_id} for ₹${amount_paise / 100}`);
}

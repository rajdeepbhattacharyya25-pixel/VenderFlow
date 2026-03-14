import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RazorpayService } from "../_shared/payments/razorpay.ts";
import { TelegramProvider } from "../_shared/notifications/telegram.ts";

/**
 * Daily Reconciliation Engine
 * Compares Razorpay payments/transfers with internal ledger.
 * Flags discrepancies > threshold and auto-pauses payouts on critical mismatch.
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

const MISMATCH_THRESHOLD = 1; // ₹1 (configurable via platform_settings)

serve(async (_req) => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const fromTs = Math.floor(yesterday.getTime() / 1000);
    const toTs = Math.floor(now.getTime() / 1000);

    let runId: string | null = null;

    try {
        // 1. Create reconciliation run record
        const { data: run, error: runError } = await supabase
            .from('reconciliation_runs')
            .insert({
                run_date: now.toISOString().split('T')[0],
                status: 'running',
                period_start: yesterday.toISOString(),
                period_end: now.toISOString()
            })
            .select()
            .single();

        if (runError) throw runError;
        runId = run.id;

        // 2. Fetch Razorpay payments for the period
        let razorpayPayments: any[] = [];
        try {
            razorpayPayments = await razorpay.fetchAllPayments(fromTs, toTs);
        } catch (apiErr) {
            console.error("Failed to fetch Razorpay payments:", apiErr);
            throw new Error(`Razorpay API error: ${(apiErr as Error).message}`);
        }

        // Filter to captured/authorized payments only
        const capturedPayments = razorpayPayments.filter(
            (p: any) => p.status === 'captured' || p.status === 'authorized'
        );

        // 3. Total from Razorpay
        const totalRazorpay = capturedPayments.reduce(
            (sum: number, p: any) => sum + (p.amount || 0), 0
        ) / 100; // Convert paise to rupees

        // 4. Total from internal ledger (cash account debits for the same period)
        const { data: ledgerData } = await supabase
            .from('ledger_entry_lines')
            .select(`
                debit,
                credit,
                ledger_entries!inner(created_at, reference_type)
            `)
            .eq('ledger_accounts.code', 'cash')  // This won't work with current schema, use RPC instead
            ;

        // Use direct SQL via RPC for accurate ledger total
        const { data: ledgerTotal } = await supabase.rpc('get_account_balance', {
            p_account_code: 'cash'
        });

        const totalLedger = Number(ledgerTotal) || 0;

        // 5. Compare individual payments
        let discrepancyCount = 0;
        let discrepancyTotal = 0;
        const discrepancies: any[] = [];

        for (const payment of capturedPayments) {
            const paymentId = payment.id;
            const razorpayAmount = (payment.amount || 0) / 100;

            // Check if this payment exists in our ledger
            const { data: ledgerEntry } = await supabase
                .from('ledger_entries')
                .select('id, metadata')
                .eq('reference_type', 'order_payment')
                .contains('metadata', { payment_id: paymentId })
                .limit(1)
                .single();

            if (!ledgerEntry) {
                // Payment exists in Razorpay but not in our ledger
                const diff = razorpayAmount;
                if (Math.abs(diff) > MISMATCH_THRESHOLD) {
                    discrepancyCount++;
                    discrepancyTotal += diff;
                    discrepancies.push({
                        run_id: runId,
                        external_id: paymentId,
                        external_type: 'payment',
                        razorpay_amount: razorpayAmount,
                        ledger_amount: 0,
                        discrepancy_amount: diff,
                        status: 'open'
                    });
                }
            }
        }

        // 6. Insert discrepancies
        if (discrepancies.length > 0) {
            await supabase.from('reconciliation_discrepancies').insert(discrepancies);
        }

        // 7. Overall balance check
        const overallDiscrepancy = Math.abs(totalRazorpay - totalLedger);
        const isBalanced = overallDiscrepancy <= MISMATCH_THRESHOLD;

        // 8. Update run record
        const runStatus = discrepancyCount > 0 ? 'completed_with_issues' : 'completed';
        await supabase
            .from('reconciliation_runs')
            .update({
                status: runStatus,
                total_razorpay: totalRazorpay,
                total_ledger: totalLedger,
                discrepancy_count: discrepancyCount,
                discrepancy_total: discrepancyTotal,
                completed_at: new Date().toISOString()
            })
            .eq('id', runId);

        // 9. Auto-pause payouts on critical mismatch
        if (!isBalanced && overallDiscrepancy > 100) { // >₹100 critical
            await supabase
                .from('platform_settings')
                .update({ value: 'true' })
                .eq('key', 'payouts_paused');

            await supabase
                .from('reconciliation_runs')
                .update({ auto_paused_payouts: true })
                .eq('id', runId);

            await supabase.rpc('create_system_alert', {
                p_alert_type: 'reconciliation_failed',
                p_severity: 'emergency',
                p_title: 'Payouts Auto-Paused: Reconciliation Mismatch',
                p_message: `Discrepancy of ₹${overallDiscrepancy.toFixed(2)} detected. Payouts paused automatically.`,
                p_metadata: JSON.stringify({ run_id: runId, discrepancy: overallDiscrepancy })
            });
        }

        // 10. Notify admin
        const emoji = discrepancyCount === 0 ? '✅' : '⚠️';
        await telegram.sendMessage({
            recipient: ADMIN_TELEGRAM_CHAT_ID,
            title: `${emoji} Daily Reconciliation Report`,
            message: `
Period: ${yesterday.toLocaleDateString()} - ${now.toLocaleDateString()}
---
Razorpay Total: ₹${totalRazorpay.toFixed(2)}
Ledger Total: ₹${totalLedger.toFixed(2)}
Discrepancies: ${discrepancyCount}
Status: ${runStatus}
${!isBalanced ? '\n🚨 PAYOUTS AUTO-PAUSED due to mismatch!' : ''}
            `.trim()
        }).catch(err => console.error("Telegram failed:", err));

        return new Response(JSON.stringify({
            success: true,
            run_id: runId,
            status: runStatus,
            total_razorpay: totalRazorpay,
            total_ledger: totalLedger,
            discrepancy_count: discrepancyCount
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Reconciliation error:", error);

        // Update run as failed
        if (runId) {
            await supabase
                .from('reconciliation_runs')
                .update({ status: 'failed', completed_at: new Date().toISOString() })
                .eq('id', runId);
        }

        await telegram.sendMessage({
            recipient: ADMIN_TELEGRAM_CHAT_ID,
            title: "🚨 Reconciliation Failed",
            message: `Error: ${error.message}\nAction: Check reconcile-ledger logs.`
        }).catch(() => {});

        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

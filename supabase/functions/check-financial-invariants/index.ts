import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { TelegramProvider } from "../_shared/notifications/telegram.ts";

/**
 * Financial Invariant Checker
 * Validates: Total Cash In = Seller Payables + Reserves + Platform Revenue
 * Should run hourly via cron.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TELEGRAM_TOKEN = Deno.env.get("ADMIN_TELEGRAM_TOKEN")!;
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const telegram = new TelegramProvider(ADMIN_TELEGRAM_TOKEN);

const TOLERANCE = 0.01; // ₹0.01 tolerance for floating point

serve(async (_req) => {
    try {
        // 1. Total Cash In (debit side of cash account)
        const { data: cashBalance } = await supabase.rpc('get_account_balance', {
            p_account_code: 'cash'
        });
        const totalCashIn = Number(cashBalance) || 0;

        // 2. Platform Revenue (credit side of platform_revenue account)
        const { data: revenueBalance } = await supabase.rpc('get_account_balance', {
            p_account_code: 'platform_revenue'
        });
        // Revenue is a credit account, so balance = -(SUM(debit) - SUM(credit)) = positive when credits > debits
        const platformRevenue = -(Number(revenueBalance) || 0);

        // 3. Total Seller Payables (sum of all seller_payable:* accounts)
        const { data: payableAccounts } = await supabase
            .from('ledger_accounts')
            .select('code')
            .like('code', 'seller_payable:%');

        let totalSellerPayable = 0;
        for (const acc of (payableAccounts || [])) {
            const { data: balance } = await supabase.rpc('get_account_balance', {
                p_account_code: acc.code
            });
            // Liability accounts: negative balance = credit > debit = positive owed
            totalSellerPayable += -(Number(balance) || 0);
        }

        // 4. Total Reserves (sum of all reserve:* accounts)
        const { data: reserveAccounts } = await supabase
            .from('ledger_accounts')
            .select('code')
            .like('code', 'reserve:%');

        let totalReserves = 0;
        for (const acc of (reserveAccounts || [])) {
            const { data: balance } = await supabase.rpc('get_account_balance', {
                p_account_code: acc.code
            });
            totalReserves += -(Number(balance) || 0);
        }

        // 5. Compute invariant
        const computedTotal = totalSellerPayable + totalReserves + platformRevenue;
        const discrepancy = Math.abs(totalCashIn - computedTotal);
        const isBalanced = discrepancy <= TOLERANCE;

        // 6. Store snapshot
        await supabase.from('invariant_snapshots').insert({
            total_cash_in: totalCashIn,
            total_seller_payable: totalSellerPayable,
            total_reserves: totalReserves,
            platform_revenue: platformRevenue,
            computed_total: computedTotal,
            discrepancy: discrepancy,
            is_balanced: isBalanced
        });

        // 7. Alert on mismatch
        if (!isBalanced) {
            await supabase.rpc('create_system_alert', {
                p_alert_type: 'invariant_mismatch',
                p_severity: discrepancy > 100 ? 'emergency' : 'critical',
                p_title: 'Financial Invariant Mismatch Detected',
                p_message: `Cash In (₹${totalCashIn.toFixed(2)}) ≠ Payables + Reserves + Revenue (₹${computedTotal.toFixed(2)}). Discrepancy: ₹${discrepancy.toFixed(2)}`,
                p_metadata: JSON.stringify({
                    total_cash_in: totalCashIn,
                    total_seller_payable: totalSellerPayable,
                    total_reserves: totalReserves,
                    platform_revenue: platformRevenue,
                    discrepancy
                })
            });

            // Auto-pause payouts for significant mismatch
            if (discrepancy > 10) {
                await supabase
                    .from('platform_settings')
                    .update({ value: 'true' })
                    .eq('key', 'payouts_paused');
            }

            await telegram.sendMessage({
                recipient: ADMIN_TELEGRAM_CHAT_ID,
                title: "🚨 Financial Invariant BROKEN",
                message: `
Cash In: ₹${totalCashIn.toFixed(2)}
Seller Payables: ₹${totalSellerPayable.toFixed(2)}
Reserves: ₹${totalReserves.toFixed(2)}
Platform Revenue: ₹${platformRevenue.toFixed(2)}
---
Expected: ₹${computedTotal.toFixed(2)}
Discrepancy: ₹${discrepancy.toFixed(2)}
${discrepancy > 10 ? '\n⛔ PAYOUTS AUTO-PAUSED' : ''}
                `.trim()
            }).catch(() => {});
        }

        return new Response(JSON.stringify({
            balanced: isBalanced,
            total_cash_in: totalCashIn,
            total_seller_payable: totalSellerPayable,
            total_reserves: totalReserves,
            platform_revenue: platformRevenue,
            discrepancy
        }), { headers: { "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("Invariant check error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

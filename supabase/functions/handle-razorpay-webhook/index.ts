import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { RazorpayService } from "../_shared/payments/razorpay.ts";
import { TelegramProvider } from "../_shared/notifications/telegram.ts";
import { captureServerEvent } from "../_shared/posthog-edge.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const ADMIN_TELEGRAM_TOKEN = Deno.env.get("ADMIN_TELEGRAM_TOKEN")!;
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const razorpay = new RazorpayService(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET);
const telegram = new TelegramProvider(ADMIN_TELEGRAM_TOKEN);

const PLAN_MAPPING: Record<string, any> = {
    'plan_PRO_ID': { name: 'pro', commission: 5, telegram: 5000, email: -1 },
    'plan_PREMIUM_ID': { name: 'premium', commission: 2, telegram: -1, email: -1 }
};

// ---------------------------------------------------------------------------
// Helper: SHA-256 hash for payload dedup verification
// ---------------------------------------------------------------------------
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Helper: Send Telegram notification (fire-and-forget)
// ---------------------------------------------------------------------------
async function notifyAdmin(title: string, message: string) {
    try {
        await telegram.sendMessage({ recipient: ADMIN_TELEGRAM_CHAT_ID, title, message });
    } catch (err) {
        console.error("Telegram notify failed:", err);
    }
}

serve(async (req) => {
    try {
        const body = await req.text();
        const signature = req.headers.get("x-razorpay-signature");

        // 1. Verify webhook signature
        if (!signature || !await razorpay.verifyWebhook(body, signature, RAZORPAY_WEBHOOK_SECRET)) {
            return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(body);
        const { event: eventName, payload } = event;
        const eventId = event.id || event.event_id;

        // 2. IDEMPOTENCY CHECK: Skip if already processed
        if (eventId) {
            const payloadHash = await sha256(body);
            const { data: alreadyProcessed } = await supabase.rpc('check_and_mark_webhook_processed', {
                p_event_id: eventId,
                p_event_type: eventName,
                p_payload_hash: payloadHash
            });

            if (alreadyProcessed === true) {
                console.log(`Event ${eventId} already processed, skipping.`);
                return new Response(JSON.stringify({ received: true, skipped: true }), {
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        // 3. Process event
        switch (eventName) {
            // ----- SUBSCRIPTION EVENTS -----
            case 'subscription.activated':
            case 'subscription.charged': {
                const sub = payload.subscription.entity;
                const planInfo = PLAN_MAPPING[sub.plan_id];
                if (!planInfo) break;

                const sellerId = sub.notes?.seller_id;
                if (!sellerId) break;

                const endDate = new Date(sub.current_end * 1000);

                const { error: updateError } = await supabase
                    .from('sellers')
                    .update({
                        plan: planInfo.name,
                        plan_started_at: new Date(sub.current_start * 1000).toISOString(),
                        plan_ends_at: endDate.toISOString(),
                        commission_percent: planInfo.commission,
                        telegram_message_quota_remaining: planInfo.telegram === -1 ? 999999 : planInfo.telegram,
                        email_quota_remaining: planInfo.email === -1 ? 999999 : planInfo.email,
                        status: 'active'
                    })
                    .eq('id', sellerId);

                if (updateError) throw updateError;

                await supabase.from('subscriptions').upsert({
                    seller_id: sellerId,
                    provider: 'razorpay',
                    external_subscription_id: sub.id,
                    status: sub.status,
                    plan_name: planInfo.name,
                    current_period_start: new Date(sub.current_start * 1000).toISOString(),
                    current_period_end: endDate.toISOString(),
                });

                // Analytics
                await captureServerEvent(sellerId, 'subscription_activated', {
                    plan_name: planInfo.name,
                    external_subscription_id: sub.id,
                    amount: sub.amount / 100,
                    status: sub.status
                });
                break;
            }

            case 'subscription.halted':
            case 'subscription.cancelled': {
                const sub = payload.subscription.entity;
                const sellerId = sub.notes?.seller_id;
                if (!sellerId) break;

                await supabase
                    .from('sellers')
                    .update({
                        plan: 'free',
                        commission_percent: 10,
                        telegram_message_quota_remaining: 200,
                        email_quota_remaining: 50
                    })
                    .eq('id', sellerId);

                await supabase.from('subscriptions').update({ status: sub.status }).eq('external_subscription_id', sub.id);
                break;
            }

            // ----- ORDER PAID EVENT (with Ledger + Outbox) -----
            case 'order.paid': {
                const orderEntity = payload.order.entity;
                const sellerId = orderEntity.notes?.seller_id;
                const topUpType = orderEntity.notes?.top_up_type;

                if (sellerId && topUpType) {
                    // Quota Top-up (unchanged)
                    const amount = parseInt(orderEntity.notes.amount_to_add) || 0;
                    await supabase.rpc('increment_seller_quota', {
                        seller_id_param: sellerId,
                        column_param: topUpType === 'telegram' ? 'telegram_message_quota_remaining' : 'email_quota_remaining',
                        amount_param: amount
                    });
                } else if (sellerId && orderEntity.notes?.order_id) {
                    // Store Order — Full Ledger + Outbox Flow
                    const storeOrderId = orderEntity.notes.order_id;
                    const totalAmountPaise = orderEntity.amount;
                    const paymentId = payload.payment?.entity?.id;

                    // a. Fetch Seller
                    const { data: seller, error: sellerError } = await supabase
                        .from('sellers')
                        .select('store_name, commission_percent, razorpay_account_id, kyc_status')
                        .eq('id', sellerId)
                        .single();

                    if (sellerError || !seller) {
                        console.error("Seller not found:", sellerId);
                        break;
                    }

                    // b. Calculate Split
                    const commissionPercent = Number(seller.commission_percent) || 10;
                    const platformAmtPaise = Math.floor(totalAmountPaise * (commissionPercent / 100));
                    const sellerNetPaise = totalAmountPaise - platformAmtPaise;

                    // Check seller risk for dynamic reserve %
                    const { data: riskData } = await supabase
                        .from('seller_risk_scores')
                        .select('reserve_override_percent, payouts_frozen')
                        .eq('seller_id', sellerId)
                        .single();

                    const reservePercent = riskData?.reserve_override_percent || 10;
                    const availableAmtPaise = Math.floor(sellerNetPaise * ((100 - reservePercent) / 100));
                    const reserveAmtPaise = sellerNetPaise - availableAmtPaise;

                    // c. Create LEDGER ENTRIES (double-entry)
                    // Entry 1: Platform commission
                    await supabase.rpc('create_ledger_entry', {
                        p_reference_type: 'order_payment',
                        p_reference_id: storeOrderId,
                        p_description: `Commission for order #${storeOrderId}`,
                        p_lines: JSON.stringify([
                            { account_code: 'cash', debit: Number(platformAmtPaise) / 100, credit: 0 },
                            { account_code: 'platform_revenue', debit: 0, credit: Number(platformAmtPaise) / 100 }
                        ]),
                        p_metadata: JSON.stringify({ payment_id: paymentId, seller_id: sellerId })
                    });

                    // Entry 2: Seller split (available + reserve)
                    await supabase.rpc('create_ledger_entry', {
                        p_reference_type: 'order_payment',
                        p_reference_id: storeOrderId + ':seller_split',
                        p_description: `Seller split for order #${storeOrderId}`,
                        p_lines: JSON.stringify([
                            { account_code: 'cash', debit: Number(sellerNetPaise) / 100, credit: 0 },
                            {
                                account_code: `seller_payable:${sellerId}`,
                                account_name: `Seller Payable - ${seller.store_name}`,
                                account_type: 'liability',
                                debit: 0, credit: Number(availableAmtPaise) / 100
                            },
                            {
                                account_code: `reserve:${sellerId}`,
                                account_name: `Reserve - ${seller.store_name}`,
                                account_type: 'liability',
                                debit: 0, credit: Number(reserveAmtPaise) / 100
                            }
                        ]),
                        p_metadata: JSON.stringify({ payment_id: paymentId })
                    });

                    // d. Refresh wallet cache
                    await supabase.rpc('refresh_seller_wallet_cache', { p_seller_id: sellerId });

                    // e. Insert Transfer Audit Record
                    const { data: transferRecord } = await supabase
                        .from('seller_transfers')
                        .insert({
                            order_id: storeOrderId,
                            seller_id: sellerId,
                            amount: Number(sellerNetPaise) / 100,
                            commission_amount: Number(platformAmtPaise) / 100,
                            status: 'pending'
                        })
                        .select()
                        .single();

                    // f. Schedule Reserve Release
                    if (transferRecord) {
                        await supabase.from('reserve_releases').insert({
                            seller_id: sellerId,
                            transfer_id: transferRecord.id,
                            amount: Number(reserveAmtPaise) / 100,
                            release_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                            status: 'pending'
                        });
                    }

                    // g. KYC GATE + OUTBOX: Queue the Razorpay transfer instead of calling inline
                    if (!seller.razorpay_account_id || seller.kyc_status !== 'approved') {
                        // KYC not approved or no Razorpay account — block transfer
                        await supabase.rpc('create_outbox_job', {
                            p_job_type: 'razorpay_transfer',
                            p_payload: JSON.stringify({
                                payment_id: paymentId,
                                seller_id: sellerId,
                                razorpay_account_id: seller.razorpay_account_id,
                                amount_paise: availableAmtPaise,
                                order_id: storeOrderId,
                                transfer_record_id: transferRecord?.id
                            }),
                            p_status: 'blocked_kyc'
                        });

                        await notifyAdmin("🔒 Transfer Blocked (KYC)", `
Store: ${seller.store_name}
Amount: ₹${(availableAmtPaise / 100).toFixed(2)}
Reason: ${!seller.razorpay_account_id ? 'No Razorpay account linked' : 'KYC not approved'}
Action: Review seller KYC and unblock.
                        `.trim());

                    } else if (riskData?.payouts_frozen) {
                        // Payouts frozen due to high risk
                        await supabase.rpc('create_outbox_job', {
                            p_job_type: 'razorpay_transfer',
                            p_payload: JSON.stringify({
                                payment_id: paymentId,
                                seller_id: sellerId,
                                razorpay_account_id: seller.razorpay_account_id,
                                amount_paise: availableAmtPaise,
                                order_id: storeOrderId,
                                transfer_record_id: transferRecord?.id
                            }),
                            p_status: 'blocked_kyc'
                        });

                        await notifyAdmin("🚨 Transfer Frozen (Risk)", `
Store: ${seller.store_name}
Amount: ₹${(availableAmtPaise / 100).toFixed(2)}
Reason: Payouts frozen due to high risk score.
                        `.trim());

                    } else {
                        // Normal flow — queue for outbox worker
                        await supabase.rpc('create_outbox_job', {
                            p_job_type: 'razorpay_transfer',
                            p_payload: JSON.stringify({
                                payment_id: paymentId,
                                seller_id: sellerId,
                                razorpay_account_id: seller.razorpay_account_id,
                                amount_paise: availableAmtPaise,
                                order_id: storeOrderId,
                                transfer_record_id: transferRecord?.id
                            })
                        });
                    }

                    // h. Recalculate risk score
                    await supabase.rpc('calculate_seller_risk_score', { p_seller_id: sellerId });

                    // i. Notify Admin
                    await notifyAdmin("💰 Split Payment Recorded", `
Order: #${storeOrderId}
Store: ${seller.store_name}
Total: ₹${(totalAmountPaise / 100).toFixed(2)}
---
Commission: ₹${(platformAmtPaise / 100).toFixed(2)} (${commissionPercent}%)
Seller Net: ₹${(sellerNetPaise / 100).toFixed(2)}
Available: ₹${(availableAmtPaise / 100).toFixed(2)}
Reserve (${reservePercent}%): ₹${(reserveAmtPaise / 100).toFixed(2)}
---
Transfer: Queued via Outbox
                    `.trim());

                    // Analytics
                    await captureServerEvent(sellerId, 'order_paid', {
                        order_id: storeOrderId,
                        payment_id: paymentId,
                        total_amount: totalAmountPaise / 100,
                        seller_amount: availableAmtPaise / 100,
                        commission_amount: platformAmtPaise / 100,
                        reserve_amount: reserveAmtPaise / 100,
                        currency: 'INR'
                    });
                }
                break;
            }

            case 'payment.disputed': {
                const disputeEntity = payload.dispute.entity;
                const paymentEntity = payload.payment.entity;
                const sellerId = paymentEntity.notes?.seller_id;
                const orderId = paymentEntity.notes?.order_id;
                
                if (!sellerId) {
                    console.error("Dispute received but no seller_id in payment notes");
                    break;
                }

                // Call the dispute ingestion RPC
                const { data: disputeId, error: disputeError } = await supabase.rpc('handle_dispute_ingestion', {
                    p_seller_id: sellerId,
                    p_external_dispute_id: disputeEntity.id,
                    p_amount: Number(disputeEntity.amount) / 100,
                    p_reason: disputeEntity.reason_code,
                    p_order_id: orderId
                });

                if (disputeError) throw disputeError;

                await notifyAdmin("🚨 Chargeback / Dispute Received", `
Store: ${paymentEntity.notes?.store_name || sellerId}
Amount: ₹${(disputeEntity.amount / 100).toFixed(2)}
Reason: ${disputeEntity.reason_code}
Payment ID: ${paymentEntity.id}
---
Action: Dispute record #${disputeId} created. Funds moved to holding.
                `.trim());
                break;
            }

            // ----- REFUND EVENT (with Ledger) -----
            case 'refund.processed': {
                const refund = payload.refund.entity;
                const paymentId = refund.payment_id;
                const refundAmountPaise = refund.amount;
                const sellerId = refund.notes?.seller_id;
                if (!sellerId) break;

                const { data: seller } = await supabase
                    .from('sellers')
                    .select('store_name')
                    .eq('id', sellerId)
                    .single();

                // Debit via ledger waterfall (reserve → available → negative)
                await supabase.rpc('debit_seller_balances', {
                    seller_id_param: sellerId,
                    amount_to_debit: Number(refundAmountPaise) / 100
                });

                // Queue Razorpay reversal via outbox
                const { data: orderTransfer } = await supabase
                    .from('seller_transfers')
                    .select('id, razorpay_transfer_id')
                    .eq('seller_id', sellerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (orderTransfer?.razorpay_transfer_id) {
                    await supabase.rpc('create_outbox_job', {
                        p_job_type: 'razorpay_reversal',
                        p_payload: JSON.stringify({
                            transfer_id: orderTransfer.razorpay_transfer_id,
                            amount_paise: refundAmountPaise,
                            seller_id: sellerId,
                            payment_id: paymentId
                        })
                    });
                }

                // Recalculate risk score (refund affects score)
                await supabase.rpc('calculate_seller_risk_score', { p_seller_id: sellerId });

                await notifyAdmin("⚠️ Refund Processed", `
Store: ${seller?.store_name || 'Unknown'}
Refund: ₹${(refundAmountPaise / 100).toFixed(2)}
Status: Ledger debited (Reserve → Available → Negative)
Reversal: Queued via Outbox
Payment ID: ${paymentId}
                `.trim());

                // Analytics
                await captureServerEvent(sellerId, 'refund_processed', {
                    payment_id: paymentId,
                    amount: refundAmountPaise / 100,
                    seller_id: sellerId
                });
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Webhook error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});

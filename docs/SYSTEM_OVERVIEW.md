# VendorFlow: System Architecture & Business Logic Overview

This document provides a comprehensive summary of VendorFlow's subscription tiers, payout mechanics, financial safety systems, and operational infrastructure.

---

## 1. Subscription Tier Matrix

| Feature | **Free** | **Pro** | **Premium** |
| :--- | :--- | :--- | :--- |
| **Price** | ₹0 | ₹999/mo | ₹2,499/mo |
| **Sales Commission** | 10% | 5% | 2% |
| **Product Limit** | 10 Products | Unlimited | Unlimited |
| **Telegram Messages** | 200/mo | 5,000/mo | Unlimited |
| **Email Notifications** | 50/mo | Unlimited | Unlimited |
| **Payout Priority** | Standard | High | Immediate |

---

## 2. The Payout Lifecycle (Razorpay Route)

VendorFlow uses **Real-Time Split** via Razorpay Route. When a customer pays ₹1,000 for an order:

1.  **Platform Commission**: VendorFlow immediately deducts the commission based on the seller's plan (e.g., 10% for Free = ₹100).
2.  **Seller Split (Dynamic Reserve)**:
    *   **Available Balance**: Transferred to the seller's linked Razorpay account. Default 90% of net, but dynamically adjusted by the **Risk Engine** (see §7).
    *   **Reserve Balance**: Held in the platform's reserve for **7 days**. Default 10%, increases to 20% for elevated-risk sellers.
3.  **Reserve Release**: After 7 days, the reserve is automatically moved to `available_balance` and transferred to the seller (provided no refund occurred).

### Double-Entry Ledger

All money movements are recorded in an **immutable, double-entry ledger**. Balances in `seller_wallets` are a **cached view** derived from the ledger, not the source of truth.

| Account | Debit | Credit |
| :--- | :--- | :--- |
| `cash` (Customer Payment) | ₹1,000 | |
| `platform_revenue` | | ₹100 |
| `seller_payable:<seller_id>` | | ₹810 |
| `reserve:<seller_id>` | | ₹90 |

**Invariant**: `SUM(debit) = SUM(credit)` for every entry. Always.

### Outbox Pattern

Razorpay API calls (transfers, reversals) are **never made inline**. Instead:
1.  Webhook handler creates a **ledger entry** and an **outbox job**.
2.  The `process-outbox` worker claims jobs, calls Razorpay, and handles retries with exponential backoff (30s → 5m → 30m → 2h → 12h).
3.  After `max_retries` (5), the job is marked `failed` and an admin alert is raised.

---

## 3. Financial Safety & Refund "Waterfall"

To protect the platform from financial loss during refunds, the system uses a deterministic waterfall:

*   **Refund Triggered**: If a customer requests a ₹1,000 refund.
*   **Safety Debit Order** (via `debit_seller_balances` RPC):
    1.  **Reserve First**: System first takes from the seller's `reserve` ledger account.
    2.  **Available Second**: If reserve is insufficient, it takes from `seller_payable` account.
    3.  **Negative Balance**: If both are empty, the seller's account goes into **Negative Balance**.
*   **Recovery**: Any future sales by that seller will first "pay back" the negative balance until it reaches ₹0.
*   **Razorpay Reversal**: Queued via outbox for automatic retry.

---

## 4. Webhook Idempotency

Every Razorpay webhook is processed **exactly once**:

1.  Webhook arrives with `event.id` from Razorpay.
2.  `check_and_mark_webhook_processed` RPC atomically checks `processed_webhook_events` table.
3.  If `event.id` already exists → return `200 OK` and skip processing.
4.  If new → mark as processed and continue.

This eliminates double-pay and double-debit bugs from webhook retries.

---

## 5. End-to-End Reconciliation

A **daily automated reconciliation** job (`reconcile-ledger` Edge Function) ensures:

1.  **Fetch**: Razorpay payments, transfers, and settlements via Settlement APIs.
2.  **Compare**: Individual payments against internal ledger entries.
3.  **Flag**: Any mismatch > ₹1 (configurable) is recorded in `reconciliation_discrepancies`.
4.  **Auto-Pause**: If overall discrepancy > ₹100, payouts are **automatically paused** and an emergency alert fires.

| Rule | Threshold |
| :--- | :--- |
| Individual mismatch alert | > ₹1 |
| Auto-pause payouts | > ₹100 |
| Zero-tolerance target | 0 unresolved mismatches |

---

## 6. Financial Invariant Monitor

An **hourly check** (`check-financial-invariants` Edge Function) validates:

```
Total Customer Payments (cash account)
= SUM(seller_payable accounts)
+ SUM(reserve accounts)
+ Platform Revenue
```

If mismatch > ₹0.01:

* Creates a `system_alert` with severity `critical` or `emergency`.
* Auto-pauses payouts for discrepancy > ₹10.
* Sends immediate Telegram notification.
* Stores snapshot in `invariant_snapshots` for audit trail.

---

## 7. Fraud Score & Risk Engine

Every seller has a **dynamic risk score** (0–100), recalculated on each order:

| Factor | Weight |
| :--- | :--- |
| New account (<7 days) | +20 |
| No KYC (`kyc_status ≠ approved`) | +25 |
| High refund rate (>10%) | +20 |
| Order velocity spike (>3x 7-day avg) | +15 |
| High-value order (>₹10,000) | +10 |
| IP change | +10 |

| Score | Risk Level | Action |
| :--- | :--- | :--- |
| 0–30 | Normal | Standard reserve (10%) |
| 30–50 | Elevated | Increase reserve to 20% |
| 50–70 | High | Manual review required |
| 70+ | Critical | **Freeze payouts** |

---

## 8. KYC & Seller Verification Gating

| Gate | Enforcement |
| :--- | :--- |
| **Razorpay Connection** | Sellers cannot receive payouts without a valid `razorpay_account_id`. |
| **KYC Approval** | Sellers must submit PAN/GST. Transfers are `blocked_kyc` in outbox until approved. |
| **Product Publish** | KYC must be approved before high-volume product publishing. |
| **Quota Enforcement** | Every product or message is checked via `checkQuota` utility. |

---

## 9. Administrative HUD & Automation

The Admin Dashboard (`/admin`) acts as a financial command center:

* Financial Metrics: Total GMV, Platform Reserves, Net Payables, Negative Balances.
* System Alerts: Invariant mismatches, outbox failures, reconciliation issues (with acknowledge workflow).
* Reconciliation Status: Latest run results, open discrepancies.
* Risk Overview: Seller distribution by risk level, frozen payouts count.
* Outbox Monitor: Pending, processing, failed, and KYC-blocked job counts.
* Telegram Notifications: Split alerts, refund alerts, KYC/risk alerts, reconciliation reports.

---

## 10. Observability & Runbooks

| System | Purpose |
| :--- | :--- |
| `system_alerts` | Structured alerts with severity, acknowledge workflow |
| `runbooks` | Seeded operational procedures for known failure modes |
| `invariant_snapshots` | Hourly financial balance verification snapshots |
| DR Runbook | RTO: 4h, RPO: 1h, quarterly restore drills |

### Seeded Runbooks

| Alert Type | Runbook |
| :--- | :--- |
| `invariant_mismatch` | Pause → Reconcile → Identify → Adjust → Resume |
| `reconciliation_failed` | Check API → Review logs → Retry → Escalate |
| `outbox_failed` | Review job → Fix cause → Reset job → Verify |
| `risk_critical` | Review seller → Verify orders → Contact → Decision |

---

## 11. Hard Guarantees

| Guarantee | Mechanism |
| :--- | :--- |
| **No balance drift** | Double-entry ledger with `SUM(debit) = SUM(credit)` per entry |
| **No double-processing** | Idempotency via `processed_webhook_events` table |
| **No inline API failures** | Outbox pattern with 5-retry exponential backoff |
| **Automated reconciliation** | Daily Razorpay ↔ Ledger comparison with zero-tolerance alert |
| **Deterministic refund waterfall** | Reserve → Available → Negative, fully automated |
| **Auto-pause on drift** | Financial invariant monitor auto-pauses payouts |

> These three mechanisms — **atomic ledger operations + idempotency + deterministic refund waterfall** — eliminate >95% of real financial failures.

---

## 12. Technical Components Reference

| Component | Path | Purpose |
| :--- | :--- | :--- |
| **Webhook Handler** | `supabase/functions/handle-razorpay-webhook/index.ts` | Idempotent payment, split, and refund processing with ledger entries |
| **Outbox Worker** | `supabase/functions/process-outbox/index.ts` | Reliable Razorpay transfer/reversal execution with retries |
| **Reconciliation** | `supabase/functions/reconcile-ledger/index.ts` | Daily Razorpay ↔ Ledger comparison |
| **Invariant Check** | `supabase/functions/check-financial-invariants/index.ts` | Hourly balance validation |
| **Razorpay Service** | `supabase/functions/_shared/payments/razorpay.ts` | API client with Settlement/Reconciliation endpoints |
| **Quota Logic** | `supabase/functions/_shared/quotas.ts" | Centralized limit checking |
| **Admin API** | `lib/admin-api.ts` | Platform-wide financial aggregates + monitoring endpoints |
| **DR Runbook** | `docs/runbooks/disaster-recovery.md` | RTO/RPO targets, incident response, restore drills |
| **Ledger RPCs** | `create_ledger_entry`, `get_account_balance`, `refresh_seller_wallet_cache` | Atomic ledger operations |
| **Safety RPCs** | `debit_seller_balances`, `increment_seller_balances` | Ledger-based balance modifications |
| **Risk RPCs** | `calculate_seller_risk_score` | Multi-factor fraud scoring |
| **Idempotency RPC** | `check_and_mark_webhook_processed` | Atomic webhook dedup |
| **Outbox RPCs** | `create_outbox_job`, `claim_outbox_job`, `complete_outbox_job` | Job queue management |

---

## 13. Architecture Flow

1. **Incoming Payment**: Razorpay Webhook → `handle-razorpay-webhook`
2. **Solvency & Logic**: Ledger Entry (Double Entry) + KYC/Risk Check
3. **Queueing**: Outbox Job Created
4. **Execution**: `process-outbox` Worker initiates Razorpay Transfer
5. **Audit**: `reconcile-ledger` (Daily) + `check-financial-invariants` (Hourly)
6. **Dispute Ingestion**: Razorpay `payment.disputed` → `handle_dispute_ingestion` (funds moved to holding).
7. **Payout Eligibility Engine**: `check_payout_eligibility` (Global Toggle + Merchant Hold) enforced in outbox.

---

## 14. Dispute & Payout Gating (The "Holding Account" Strategy)

### The "Holding Account" Strategy

When a dispute occurs, funds are moved from `seller_payable` to a dedicated `dispute_holding` ledger account. This ensures the platform's solvency while the case is investigated.

* **Logic**: `handle_dispute_ingestion` RPC.
* **Ledger**: `Debit: seller_payable` | `Credit: dispute_holding`.

### Multilayer Payout Gating

Payouts are protected by a two-tier "Kill Switch" system:

1. **Global Toggle**: Emergency platform-wide freeze via `system_config.payouts_enabled`.
2. **Merchant Gate**: Individual seller holds (`held_manual` or `held_auto`) via `seller_security_settings`.
3. **Enforcement**: The `process-outbox` worker calls `check_payout_eligibility` before *every* transfer.

### Mandatory Audit & HUD

* **Audit Trail**: Every financial status change (Hold/Release/Resolve) requires a mandatory reason note and is logged in `admin_audit_logs`.
* **Admin HUD**:
  * `/admin/disputes`: Unified view for investigation and evidence resolution.
  * `/admin/payouts`: Real-time safety control center with global toggle and high-risk queue.

---

# VendorFlow: Disaster Recovery Runbook

## Overview

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | 4 hours |
| **RPO** (Recovery Point Objective) | 1 hour |
| **Backup Method** | Supabase PITR (Point-in-Time Recovery) |
| **Backup Encryption** | AES-256 at rest (Supabase managed) |

---

## 1. Point-in-Time Recovery (PITR)

Supabase provides continuous WAL archiving. To restore:

1. Go to **Supabase Dashboard → Project → Database → Backups**.
2. Select **Point-in-Time Recovery**.
3. Choose a timestamp **before** the incident.
4. Confirm restoration (this replaces the current database).

> ⚠️ **PITR replaces the current DB entirely.** If you need selective restore, use logical backups.

---

## 2. Incident Response Procedure

### Step 1: Assess Impact
- Identify affected tables/data.
- Check `system_alerts` for related alerts.
- Review `invariant_snapshots` for financial drift.

### Step 2: Pause Operations
```sql
-- Pause all payouts
UPDATE platform_settings SET value = 'true' WHERE key = 'payouts_paused';
```

### Step 3: Determine Root Cause
- Check Edge Function logs in Supabase Dashboard.
- Review `reconciliation_runs` for recent discrepancies.
- Check `outbox_jobs` for stuck/failed jobs.

### Step 4: Restore (if needed)
- For financial data: Use PITR to restore to last known good state.
- For non-financial data: Use selective `pg_dump` + restore.

### Step 5: Validate Integrity
```sql
-- Verify ledger balance invariant
SELECT
    (SELECT COALESCE(SUM(debit) - SUM(credit), 0) FROM ledger_entry_lines l JOIN ledger_accounts a ON l.account_id = a.id WHERE a.code = 'cash') AS cash_in,
    (SELECT COALESCE(SUM(credit) - SUM(debit), 0) FROM ledger_entry_lines l JOIN ledger_accounts a ON l.account_id = a.id WHERE a.code LIKE 'seller_payable:%') AS payables,
    (SELECT COALESCE(SUM(credit) - SUM(debit), 0) FROM ledger_entry_lines l JOIN ledger_accounts a ON l.account_id = a.id WHERE a.code LIKE 'reserve:%') AS reserves,
    (SELECT COALESCE(SUM(credit) - SUM(debit), 0) FROM ledger_entry_lines l JOIN ledger_accounts a ON l.account_id = a.id WHERE a.code = 'platform_revenue') AS revenue;
-- cash_in SHOULD EQUAL payables + reserves + revenue
```

### Step 6: Resume Operations
```sql
UPDATE platform_settings SET value = 'false' WHERE key = 'payouts_paused';
```

### Step 7: Post-Incident Review
- Document the incident timeline.
- Update this runbook with lessons learned.
- Schedule follow-up reconciliation run.

---

## 3. Restore Drill Schedule

| Frequency | Type | Scope |
|-----------|------|-------|
| Quarterly | Full PITR | Restore to staging, verify data integrity |
| Monthly | Invariant check | Run `check-financial-invariants` manually |
| Weekly | Reconciliation | Verify daily reconciliation runs are passing |

---

## 4. Emergency Contacts

| Role | Escalation |
|------|-----------|
| Primary On-Call | Admin Telegram (auto-alerts) |
| Secondary | Razorpay Support (for payment disputes) |
| Supabase Issues | Supabase Support Portal |

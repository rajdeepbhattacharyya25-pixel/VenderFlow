-- ===========================================================================
-- Migration: AI Oracle Financial Views
-- Purpose: Pre-aggregated views for the AI Financial Oracle (Cashflow Clarity)
-- ===========================================================================

-- 1. Daily Aggregated Ledger Summary (for Trend Analysis)
CREATE OR REPLACE VIEW public.oracle_daily_financial_summary AS
SELECT 
    date_trunc('day', created_at)::date as summary_date,
    reference_type,
    SUM(debit) as total_debit,
    SUM(credit) as total_credit,
    COUNT(DISTINCT entry_id) as entry_count
FROM public.ledger_entry_lines l
JOIN public.ledger_entries e ON l.entry_id = e.id
GROUP BY 1, 2;

-- 2. Seller Wallet & Risk Snapshot (Context for individual holds/reserves)
CREATE OR REPLACE VIEW public.oracle_seller_financial_health AS
SELECT 
    s.id as seller_id,
    s.name as seller_name,
    w.available_balance,
    w.reserve_balance,
    w.negative_balance,
    r.risk_score,
    r.risk_level,
    (SELECT COUNT(*) FROM public.disputes d WHERE d.seller_id = s.id AND d.status = 'open') as open_disputes_count,
    (SELECT SUM(amount) FROM public.reserve_releases rr WHERE rr.seller_id = s.id AND rr.status = 'pending' AND rr.release_at > now()) as upcoming_reserve_releases
FROM public.sellers s
LEFT JOIN public.seller_wallets w ON s.id = w.seller_id
LEFT JOIN public.seller_risk_scores r ON s.id = r.seller_id;

-- 3. Top Liquidity Movements (Highlighting large payout/order events)
CREATE OR REPLACE VIEW public.oracle_liquidity_movements AS
SELECT 
    e.id as entry_id,
    e.created_at,
    e.reference_type,
    e.description,
    SUM(l.debit) as amount
FROM public.ledger_entries e
JOIN public.ledger_entry_lines l ON e.id = l.entry_id
GROUP BY e.id, e.created_at, e.reference_type, e.description
ORDER BY amount DESC
LIMIT 50;

-- 4. Payout Gaps View (Identifying sellers with high reserve vs available)
CREATE OR REPLACE VIEW public.oracle_payout_gaps AS
SELECT 
    seller_name,
    available_balance,
    reserve_balance,
    round((reserve_balance / NULLIF(available_balance + reserve_balance, 0)) * 100, 2) as reserve_ratio_percent,
    upcoming_reserve_releases
FROM public.oracle_seller_financial_health
WHERE reserve_balance > 0
ORDER BY reserve_balance DESC;

-- RLS: Only accessible by service role (used by Edge Functions)
-- Direct access to these views is restricted.

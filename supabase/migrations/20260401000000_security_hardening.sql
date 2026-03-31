-- Security Hardening Migration
-- Date: 2026-04-01
-- Goal: Fix critical RLS findings, harden search paths, and secure views.

BEGIN;

-- 1. ADD AUDIT TRAIL TO FINANCIAL/RISK TABLES
ALTER TABLE public.ledger_accounts ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.ledger_entries ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.ledger_entry_lines ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.risk_actions_log ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.reconciliation_runs ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
ALTER TABLE public.reconciliation_discrepancies ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- 2. HARDEN SEARCH PATHS FOR PUBLIC FUNCTIONS
-- Explicitly locking search_path prevents search_path hijacking attacks.
DO $$ 
DECLARE 
    func_name text;
BEGIN
    FOR func_name IN (SELECT 'public.' || proname FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace WHERE nspname = 'public' AND proname IN ('create_system_alert', 'on_system_alert_notify', 'handle_new_user', 'update_product_rating_stats')) 
    LOOP
        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp;', func_name);
    END LOOP;
END $$;

-- 3. REDEFINE ORACLE VIEWS WITH SECURITY BARRIER AND FILTERS
-- SECURITY BARRIER prevents predicate pushdown which could leak data.
CREATE OR REPLACE VIEW public.oracle_payout_gaps 
WITH (security_barrier) AS
SELECT 
    s.id as seller_id,
    s.store_name,
    s.available_balance,
    (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE seller_id = s.id AND status = 'pending') as pending_payouts,
    CASE 
        WHEN s.risk_score > 80 THEN 'Critical: High dispute volume'
        WHEN s.risk_score > 50 THEN 'Warning: Recent store changes'
        ELSE 'Normal: Standard holding period'
    END as risk_reason,
    s.risk_score
FROM public.sellers s
WHERE (s.id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
AND auth.uid() IS NOT NULL;

CREATE OR REPLACE VIEW public.oracle_platform_context 
WITH (security_barrier) AS
SELECT 
    ps.reserve_rate,
    ps.commission_rate,
    ps.min_payout_amount,
    ps.payout_delay_days,
    (SELECT COUNT(*) FROM sellers WHERE status = 'active') as active_sellers,
    (SELECT COALESCE(SUM(available_balance), 0) FROM sellers) as total_available_liquidity
FROM public.platform_settings ps
WHERE (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
LIMIT 1;

-- 4. ENABLE RLS AND SET BASELINE DENY-ALL FOR ORPHANED TABLES
-- This ensures no table is accidentally public.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- 5. IMPLEMENT DETAILED RLS POLICIES

-- A. Ledger/Risk (Admin/Service Only)
CREATE POLICY "Admins and service can manage financial data" ON public.ledger_accounts
FOR ALL TO authenticated, service_role
USING (auth.role() = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
WITH CHECK (auth.role() = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Repeat for other ledger/risk tables
DO $$ 
DECLARE 
    tbl_name text;
BEGIN
    FOR tbl_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('ledger_entries', 'ledger_entry_lines', 'risk_actions_log', 'reconciliation_runs', 'reconciliation_discrepancies')) 
    LOOP
        EXECUTE format('CREATE POLICY "Admins and service only" ON public.%I FOR ALL TO authenticated, service_role USING (auth.role() = ''service_role'' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'') WITH CHECK (auth.role() = ''service_role'' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = ''admin'');', tbl_name);
    END LOOP;
END $$;

-- B. Debug Logs (Service Only INSERT)
CREATE POLICY "Service role writes logs" ON public.debug_logs
FOR INSERT TO authenticated, service_role
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins reads logs" ON public.debug_logs
FOR SELECT TO authenticated, service_role
USING (auth.role() = 'service_role' OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- C. Public Funnels (Anon Insert Only)
CREATE POLICY "Anon can submit applications" ON public.seller_applications
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can track page views" ON public.store_page_views
FOR INSERT TO anon WITH CHECK (true);

-- D. Baseline Deny-All (Everything else remains closed by RLS default)
-- Note: Already enabled RLS above, with no other policies, no access is granted.

COMMIT;

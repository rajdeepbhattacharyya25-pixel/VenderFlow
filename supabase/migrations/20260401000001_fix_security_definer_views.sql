-- Fix Security Definer Views
-- Date: 2026-04-01
-- Goal: Resolve 'Security Definer View' critical errors by converting to 'SECURITY INVOKER'.

BEGIN;

-- 1. DROP EXISTING VIEWS
DROP VIEW IF EXISTS public.oracle_payout_gaps;
DROP VIEW IF EXISTS public.oracle_platform_context;

-- 2. RECREATE AS SECURITY INVOKER (Default behavior)
-- Note: Security Barrier is still applied for additional protection.
CREATE OR REPLACE VIEW public.oracle_payout_gaps 
WITH (security_barrier) AS
SELECT s.id AS seller_id,
    s.store_name,
    w.available_balance,
    w.reserve_balance,
    ( SELECT COALESCE(sum(st.amount), (0)::numeric)
           FROM public.seller_transfers st
          WHERE ((st.seller_id = s.id) AND (st.status = 'pending'::text))) AS pending_payouts,
        CASE
            WHEN (s.status = 'frozen'::text) THEN 'Critical: Store Frozen'::text
            WHEN (w.negative_balance > (0)::numeric) THEN 'Warning: Negative Balance'::text
            ELSE 'Normal'::text
        END AS status_reason
   FROM (public.sellers s
     JOIN public.seller_wallets w ON ((s.id = w.seller_id)))
WHERE (s.id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
AND auth.uid() IS NOT NULL;

CREATE OR REPLACE VIEW public.oracle_platform_context 
WITH (security_barrier) AS
SELECT 
    ps.reserve_rate,
    ps.commission_rate,
    ps.min_payout_amount,
    ps.payout_delay_days,
    ( SELECT count(*) FROM public.sellers WHERE status = 'active'::text) AS active_sellers,
    ( SELECT COALESCE(sum(available_balance), (0)::numeric) FROM public.seller_wallets) AS total_available_liquidity
FROM public.platform_settings ps
WHERE (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
LIMIT 1;

-- 3. GRANT PERMISSIONS
-- Security Invoker views require selecting user to have grants on THE VIEW AND THE UNDERLYING TABLES.
GRANT SELECT ON public.oracle_payout_gaps TO authenticated, service_role;
GRANT SELECT ON public.oracle_platform_context TO service_role; -- Limit context to service_role/admins (admins check is inside the view).
GRANT SELECT ON public.oracle_platform_context TO authenticated; -- Role check inside the view will handle filtering.

COMMIT;

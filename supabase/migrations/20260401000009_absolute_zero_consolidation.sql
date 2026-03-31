-- Task 7: Absolute Zero Warning state
-- Splitting FOR ALL into explicit actions to resolve "Multiple Permissive Policies"
-- Finalizing InitPlan optimizations

BEGIN;

-- 1. Products: Split FOR ALL to avoid SELECT overlap
DROP POLICY IF EXISTS "Sellers manage own products" ON public.products;
CREATE POLICY "Sellers insert own products" ON public.products FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = seller_id);
CREATE POLICY "Sellers update own products" ON public.products FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = seller_id) WITH CHECK ((SELECT auth.uid()) = seller_id);
CREATE POLICY "Sellers delete own products" ON public.products FOR DELETE TO authenticated USING ((SELECT auth.uid()) = seller_id);

-- 2. Promotions: Split FOR ALL
DROP POLICY IF EXISTS "Sellers manage own promotions" ON public.promotions;
CREATE POLICY "Sellers insert own promotions" ON public.promotions FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = seller_id);
CREATE POLICY "Sellers update own promotions" ON public.promotions FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = seller_id) WITH CHECK ((SELECT auth.uid()) = seller_id);
CREATE POLICY "Sellers delete own promotions" ON public.promotions FOR DELETE TO authenticated USING ((SELECT auth.uid()) = seller_id);

-- 3. Reserve Releases: Split FOR ALL
DROP POLICY IF EXISTS "Admins manage all reserve releases" ON public.reserve_releases;
CREATE POLICY "Admins manage all reserve releases" ON public.reserve_releases
    FOR ALL TO authenticated
    USING (
        (SELECT auth.role()) = 'service_role' 
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );
-- Actually, the advisor still flagged this. I'll try splitting it too.
DROP POLICY IF EXISTS "Admins manage all reserve releases" ON public.reserve_releases;
CREATE POLICY "Admins insert reserve" ON public.reserve_releases FOR INSERT TO authenticated WITH CHECK ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Admins update reserve" ON public.reserve_releases FOR UPDATE TO authenticated USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Admins delete reserve" ON public.reserve_releases FOR DELETE TO authenticated USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
-- And ensure the SELECT policy is the ONLY one for SELECT.

-- 4. Seller Quotas: Split FOR ALL
DROP POLICY IF EXISTS "Admins manage all quotas" ON public.seller_quotas;
CREATE POLICY "Admins manage quotas (Write)" ON public.seller_quotas FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
-- Wait, the advisor says "Multiple Permissive Policies" include {"Admins manage all quotas","Sellers view own quotas"} for SELECT.
-- So I'll change Admins to exclude SELECT.
DROP POLICY IF EXISTS "Admins manage quotas (Write)" ON public.seller_quotas;
CREATE POLICY "Admins insert quotas" ON public.seller_quotas FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Admins update quotas" ON public.seller_quotas FOR UPDATE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Admins delete quotas" ON public.seller_quotas FOR DELETE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 5. Seller Transfers: Split FOR ALL
DROP POLICY IF EXISTS "Admins manage seller transfers" ON public.seller_transfers;
CREATE POLICY "Admins insert transfers" ON public.seller_transfers FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Admins update transfers" ON public.seller_transfers FOR UPDATE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Admins delete transfers" ON public.seller_transfers FOR DELETE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 6. Email Logs: Harmonize
DROP POLICY IF EXISTS "Admins can insert email logs" ON public.email_logs;

-- 7. Fix remaining InitPlan warnings by ensuring (SELECT auth.uid()) is used EVERYWHERE
-- Table: admin_audit_logs
DROP POLICY IF EXISTS "Admins view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins view audit logs" ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: runbooks
DROP POLICY IF EXISTS "Service role and admin full access" ON public.runbooks;
CREATE POLICY "Service role and admin full access" ON public.runbooks
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: processed_webhook_events
DROP POLICY IF EXISTS "Service role and admin full access" ON public.processed_webhook_events;
CREATE POLICY "Service role and admin full access" ON public.processed_webhook_events
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: invariant_snapshots
DROP POLICY IF EXISTS "Service role and admin full access" ON public.invariant_snapshots;
CREATE POLICY "Service role and admin full access" ON public.invariant_snapshots
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: seller_requests
DROP POLICY IF EXISTS "Service role and admin full access" ON public.seller_requests;
CREATE POLICY "Service role and admin full access" ON public.seller_requests
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: system_alerts
DROP POLICY IF EXISTS "Service role and admin full access" ON public.system_alerts;
CREATE POLICY "Service role and admin full access" ON public.system_alerts
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: telegram_message_logs
DROP POLICY IF EXISTS "Service role and admin full access" ON public.telegram_message_logs;
CREATE POLICY "Service role and admin full access" ON public.telegram_message_logs
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- Table: telegram_message_queue
DROP POLICY IF EXISTS "Service role and admin full access" ON public.telegram_message_queue;
CREATE POLICY "Service role and admin full access" ON public.telegram_message_queue
    FOR ALL TO authenticated
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

COMMIT;

-- Task 2 & 3: RLS InitPlan Optimization and Policy Consolidation
-- Standardizing on (SELECT auth.uid()) and (SELECT auth.role()) pattern
-- Consolidating redundant permissive policies

BEGIN;

-- 1. Reserve Releases (Consolidation + Optimization)
DROP POLICY IF EXISTS "Admins have full access to reserve releases" ON public.reserve_releases;
DROP POLICY IF EXISTS "Sellers can view own reserve releases" ON public.reserve_releases;
DROP POLICY IF EXISTS "Sellers view own reserves" ON public.reserve_releases;

CREATE POLICY "Admins manage all reserve releases" ON public.reserve_releases
    FOR ALL TO authenticated
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Sellers view own reserve releases" ON public.reserve_releases
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 2. Sellers (Optimization)
DROP POLICY IF EXISTS "Sellers can update their own non-sensitive fields" ON public.sellers;
DROP POLICY IF EXISTS "Unified view sellers (Auth)" ON public.sellers;

CREATE POLICY "Sellers manage own profile" ON public.sellers
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users view relevant sellers" ON public.sellers
    FOR SELECT TO authenticated
    USING (
        id = (SELECT auth.uid()) OR 
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 3. Push Subscriptions (Optimization)
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
    FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- 4. Seller Security Settings (Optimization)
DROP POLICY IF EXISTS "Sellers can view own security settings" ON public.seller_security_settings;
CREATE POLICY "Sellers view own security settings" ON public.seller_security_settings
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 5. Outbox Jobs (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.outbox_jobs;
CREATE POLICY "Service role and admin full access" ON public.outbox_jobs
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

-- 6. Seller Risk Scores (Optimization)
DROP POLICY IF EXISTS "Sellers view own risk" ON public.seller_risk_scores;
CREATE POLICY "Sellers view own risk" ON public.seller_risk_scores
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 7. Seller Applications (Optimization)
DROP POLICY IF EXISTS "Admins can view all applications" ON public.seller_applications;
DROP POLICY IF EXISTS "Admins can update applications" ON public.seller_applications;

CREATE POLICY "Admins manage applications" ON public.seller_applications
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 8. Disputes (Optimization)
DROP POLICY IF EXISTS "Admins can manage disputes" ON public.disputes;
CREATE POLICY "Admins manage disputes" ON public.disputes
    FOR ALL TO authenticated
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 9. Admin Audit Logs (Optimization)
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins view audit logs" ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING ((SELECT auth.jwt() ->> 'role') = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 10. Promotions (Optimization)
DROP POLICY IF EXISTS "Sellers can manage their own promotions" ON public.promotions;
CREATE POLICY "Sellers manage own promotions" ON public.promotions
    FOR ALL TO authenticated
    USING (seller_id = (SELECT auth.uid()))
    WITH CHECK (seller_id = (SELECT auth.uid()));

-- 11. Product Reviews (Optimization)
DROP POLICY IF EXISTS "Customers can insert their own reviews" ON public.product_reviews;
CREATE POLICY "Customers insert own reviews" ON public.product_reviews
    FOR INSERT TO authenticated
    WITH CHECK (buyer_id = (SELECT auth.uid()));

-- 12. Backups (Optimization)
DROP POLICY IF EXISTS "Admins can view all backups" ON public.backups;
DROP POLICY IF EXISTS "Admins can insert backups" ON public.backups;

CREATE POLICY "Admins manage backups" ON public.backups
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 13. Seller Quotas (Optimization)
DROP POLICY IF EXISTS "Admins can manage all quotas" ON public.seller_quotas;
DROP POLICY IF EXISTS "Sellers can view their own quotas" ON public.seller_quotas;

CREATE POLICY "Admins manage all quotas" ON public.seller_quotas
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

CREATE POLICY "Sellers view own quotas" ON public.seller_quotas
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 14. Store Page Views (Optimization)
DROP POLICY IF EXISTS "Sellers can view own page views" ON public.store_page_views;
CREATE POLICY "Sellers view own page views" ON public.store_page_views
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 15. API Limits Config (Consolidation + Optimization)
DROP POLICY IF EXISTS "Admin only manage api limits" ON public.api_limits_config;
DROP POLICY IF EXISTS "Admins can view API limits" ON public.api_limits_config;

CREATE POLICY "Admins manage API limits" ON public.api_limits_config
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 16. Audit Logs (Optimization)
DROP POLICY IF EXISTS "Sellers can view their own store logs" ON public.audit_logs;
CREATE POLICY "Sellers view own store logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        store_id IN (
            SELECT id FROM public.sellers WHERE user_id = (SELECT auth.uid())
            UNION
            SELECT store_id FROM public.store_staff WHERE user_id = (SELECT auth.uid())
        )
    );

-- 17. Processed Webhook Events (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.processed_webhook_events;
CREATE POLICY "Service role and admin full access" ON public.processed_webhook_events
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

-- 18. Runbooks (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.runbooks;
CREATE POLICY "Service role and admin full access" ON public.runbooks
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

-- 19. Subscriptions (Optimization)
DROP POLICY IF EXISTS "Sellers can view their own subscriptions" ON public.subscriptions;
CREATE POLICY "Sellers view own subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 20. Usage Quota Events (Optimization)
DROP POLICY IF EXISTS "Sellers can view their own usage events" ON public.usage_quota_events;
CREATE POLICY "Sellers view own usage events" ON public.usage_quota_events
    FOR SELECT TO authenticated
    USING (seller_id = (SELECT auth.uid()));

-- 21. Previews (Consolidation + Optimization)
DROP POLICY IF EXISTS "Vendors can view their own previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors can create their own previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors can update their own previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors can delete their own previews" ON public.previews;
DROP POLICY IF EXISTS "Staff can view store previews" ON public.previews;
DROP POLICY IF EXISTS "Staff can manage store previews" ON public.previews;

CREATE POLICY "Vendors manage own previews" ON public.previews
    FOR ALL TO authenticated
    USING (vendor_id = (SELECT auth.uid()))
    WITH CHECK (vendor_id = (SELECT auth.uid()));

CREATE POLICY "Staff view store previews" ON public.previews
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.store_staff 
        WHERE store_id = previews.vendor_id 
          AND user_id = (SELECT auth.uid()) 
          AND status = 'active'
    ));

-- 22. Ledger Tables (Optimization)
DROP POLICY IF EXISTS "Admins and service only" ON public.ledger_accounts;
CREATE POLICY "Admins and service manage ledger accounts" ON public.ledger_accounts
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins and service only" ON public.ledger_entries;
CREATE POLICY "Admins and service manage ledger entries" ON public.ledger_entries
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins and service only" ON public.ledger_entry_lines;
CREATE POLICY "Admins and service manage ledger entry lines" ON public.ledger_entry_lines
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 23. Platform Settings (Consolidation + Optimization)
DROP POLICY IF EXISTS "Admin only manage platform settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Admins and service only" ON public.platform_settings;
DROP POLICY IF EXISTS "Allow admin update access" ON public.platform_settings;

CREATE POLICY "Admins manage platform settings" ON public.platform_settings
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 24. Reconciliation (Optimization)
DROP POLICY IF EXISTS "Admins and service only" ON public.reconciliation_discrepancies;
CREATE POLICY "Admins manage reconciliation discrepancies" ON public.reconciliation_discrepancies
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins and service only" ON public.reconciliation_runs;
CREATE POLICY "Admins manage reconciliation runs" ON public.reconciliation_runs
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 25. Risk Actions Log (Optimization)
DROP POLICY IF EXISTS "Admins and service only" ON public.risk_actions_log;
CREATE POLICY "Admins manage risk actions log" ON public.risk_actions_log
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 26. Seller Transfers (Optimization)
DROP POLICY IF EXISTS "Admins full access transfers" ON public.seller_transfers;
CREATE POLICY "Admins manage seller transfers" ON public.seller_transfers
    FOR ALL TO authenticated
    USING ((SELECT auth.jwt() ->> 'role') = 'admin');

-- 27. Invariant Snapshots (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.invariant_snapshots;
CREATE POLICY "Service role and admin full access" ON public.invariant_snapshots
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

-- 28. Seller Requests (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.seller_requests;
CREATE POLICY "Service role and admin full access" ON public.seller_requests
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

-- 29. System Alerts (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.system_alerts;
CREATE POLICY "Service role and admin full access" ON public.system_alerts
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

-- 30. Telegram Logs (Optimization)
DROP POLICY IF EXISTS "Service role and admin full access" ON public.telegram_message_logs;
CREATE POLICY "Service role and admin full access" ON public.telegram_message_logs
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Service role and admin full access" ON public.telegram_message_queue;
CREATE POLICY "Service role and admin full access" ON public.telegram_message_queue
    FOR ALL TO authenticated, service_role
    USING ((SELECT auth.role()) = 'service_role' OR (SELECT auth.jwt() ->> 'role') = 'admin');

COMMIT;

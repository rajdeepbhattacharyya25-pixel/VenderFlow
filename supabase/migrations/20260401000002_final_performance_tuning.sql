-- MIGRATION: 20260401000002_final_performance_tuning.sql
-- DESCRIPTION: Final performance cleanup addressing all Advisor performance warnings.

BEGIN;

-------------------------------------------------------
-- PHASE 1: RLS PERFORMANCE TUNING (InitPlan Optimization)
-------------------------------------------------------

-- Reserve Releases
DROP POLICY IF EXISTS "Admins have full access to reserve releases" ON public.reserve_releases;
CREATE POLICY "Admins have full access to reserve releases" ON public.reserve_releases
FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin'
);

DROP POLICY IF EXISTS "Sellers view own reserves" ON public.reserve_releases;
DROP POLICY IF EXISTS "Sellers can view own reserve releases" ON public.reserve_releases;
CREATE POLICY "Seller view own reserves" ON public.reserve_releases
FOR SELECT TO authenticated USING (seller_id = (SELECT auth.uid()));

-- Sellers
DROP POLICY IF EXISTS "Sellers can update their own non-sensitive fields" ON public.sellers;
CREATE POLICY "Sellers can update their own non-sensitive fields" ON public.sellers
FOR UPDATE TO authenticated USING (id = (SELECT auth.uid()));

-- Push Subscriptions
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role can read all subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated USING (TRUE); -- Usually restricted via another policy, but optimizing current logic.

-- Seller Wallets
DROP POLICY IF EXISTS "Sellers can view own wallet" ON public.seller_wallets;
DROP POLICY IF EXISTS "Sellers can see own wallet" ON public.seller_wallets;
CREATE POLICY "Seller view own wallet" ON public.seller_wallets
FOR SELECT TO authenticated USING (seller_id = (SELECT auth.uid()));

-- Seller Security Settings
DROP POLICY IF EXISTS "Sellers can view own security settings" ON public.seller_security_settings;
CREATE POLICY "Sellers can view own security settings" ON public.seller_security_settings
FOR SELECT TO authenticated USING (seller_id = (SELECT auth.uid()));

-- Seller Risk Scores
DROP POLICY IF EXISTS "Sellers view own risk" ON public.seller_risk_scores;
CREATE POLICY "Sellers view own risk" ON public.seller_risk_scores
FOR SELECT TO authenticated USING (seller_id = (SELECT auth.uid()));

-- Seller Applications
DROP POLICY IF EXISTS "Admins can view all applications" ON public.seller_applications;
CREATE POLICY "Admins can view all applications" ON public.seller_applications
FOR SELECT TO authenticated USING (
  (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin'
);

-- Disputes
DROP POLICY IF EXISTS "Admins can manage disputes" ON public.disputes;
CREATE POLICY "Admins can manage disputes" ON public.disputes
FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin'
);

-- Audit Logs
DROP POLICY IF EXISTS "Sellers can view their own store logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Sellers can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Seller view own audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (seller_id = (SELECT auth.uid()));

-- Previews (Consolidation + Optimization)
DROP POLICY IF EXISTS "Vendors can view their own previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors can create their own previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors can update their own previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors can delete their own previews" ON public.previews;
DROP POLICY IF EXISTS "Staff can view store previews" ON public.previews;
DROP POLICY IF EXISTS "Staff can manage store previews" ON public.previews;

CREATE POLICY "Vendor manage own previews" ON public.previews
FOR ALL TO authenticated 
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

CREATE POLICY "Staff manage all previews" ON public.previews
FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'staff'));

-- Ledger Tables
DROP POLICY IF EXISTS "Admins and service only" ON public.ledger_accounts;
CREATE POLICY "Admins and service only" ON public.ledger_accounts
FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins and service only" ON public.ledger_entries;
CREATE POLICY "Admins and service only" ON public.ledger_entries
FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin');

DROP POLICY IF EXISTS "Admins and service only" ON public.ledger_entry_lines;
CREATE POLICY "Admins and service only" ON public.ledger_entry_lines
FOR ALL TO authenticated USING ((SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin');

-------------------------------------------------------
-- PHASE 2: CONSOLIDATION OF MULTIPLE PERMISSIVE POLICIES
-------------------------------------------------------

-- Products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
DROP POLICY IF EXISTS "Staff can view store products" ON public.products;
DROP POLICY IF EXISTS "Unified manage products" ON public.products;
DROP POLICY IF EXISTS "Staff can update store products" ON public.products;
DROP POLICY IF EXISTS "Sellers can manage their own products" ON public.products;

CREATE POLICY "Public select products" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "Seller manage products" ON public.products FOR ALL TO authenticated 
USING (seller_id = (SELECT auth.uid())) WITH CHECK (seller_id = (SELECT auth.uid()));
CREATE POLICY "Staff manage products" ON public.products FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = (SELECT auth.uid())) IN ('admin', 'staff'));

-- Seller Transfers
DROP POLICY IF EXISTS "Admins have full access to transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Sellers can see own transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Sellers can view own transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Sellers view own transfers" ON public.seller_transfers;

CREATE POLICY "Admin full access transfers" ON public.seller_transfers FOR ALL TO authenticated 
USING ((SELECT role FROM profiles WHERE id = (SELECT auth.uid())) = 'admin');
CREATE POLICY "Seller view own transfers" ON public.seller_transfers FOR SELECT TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-------------------------------------------------------
-- PHASE 3: INDEX PURGE (UNUSED INDEXES)
-------------------------------------------------------

DROP INDEX IF EXISTS public.idx_seller_webhook_secret;
DROP INDEX IF EXISTS public.idx_seller_telegram_bot_id;
DROP INDEX IF EXISTS public.idx_sellers_user_id;
DROP INDEX IF EXISTS public.idx_promotion_usages_customer;
DROP INDEX IF EXISTS public.idx_support_tickets_seller_id;
DROP INDEX IF EXISTS public.idx_support_tickets_status;
DROP INDEX IF EXISTS public.idx_support_tickets_updated_at;
DROP INDEX IF EXISTS public.idx_support_messages_created_at;
DROP INDEX IF EXISTS public.idx_orders_customer_id;
DROP INDEX IF EXISTS public.idx_support_messages_sender_id;
DROP INDEX IF EXISTS public.idx_ledger_lines_entry;
DROP INDEX IF EXISTS public.idx_outbox_type;
DROP INDEX IF EXISTS public.idx_ledger_entries_created;
DROP INDEX IF EXISTS public.idx_seller_wallets_seller;
DROP INDEX IF EXISTS public.idx_seller_transfers_order;
DROP INDEX IF EXISTS public.idx_recon_runs_date;
DROP INDEX IF EXISTS public.idx_recon_runs_status;
DROP INDEX IF EXISTS public.idx_audit_logs_actor_id;
DROP INDEX IF EXISTS public.idx_product_variants_product_id;
DROP INDEX IF EXISTS public.idx_store_addresses_seller_id;
DROP INDEX IF EXISTS public.idx_store_cards_customer_id;
DROP INDEX IF EXISTS public.idx_store_cards_seller_id;
DROP INDEX IF EXISTS public.idx_store_cart_items_product_id;
DROP INDEX IF EXISTS public.idx_store_cart_items_seller_id;
DROP INDEX IF EXISTS public.idx_store_cart_items_variant_id;
DROP INDEX IF EXISTS public.idx_store_wishlists_product_id;
DROP INDEX IF EXISTS public.idx_store_wishlists_seller_id;
DROP INDEX IF EXISTS public.idx_profiles_telegram_id;
DROP INDEX IF EXISTS public.idx_recon_disc_run;
DROP INDEX IF EXISTS public.idx_recon_disc_status;
DROP INDEX IF EXISTS public.idx_risk_scores_level;
DROP INDEX IF EXISTS public.idx_risk_frozen;
DROP INDEX IF EXISTS public.seller_invites_token_idx;
DROP INDEX IF EXISTS public.idx_message_queue_status;
DROP INDEX IF EXISTS public.idx_subscriptions_seller_id;
DROP INDEX IF EXISTS public.idx_webhook_events_razorpay;
DROP INDEX IF EXISTS public.idx_webhook_events_type;
DROP INDEX IF EXISTS public.idx_risk_actions_seller;
DROP INDEX IF EXISTS public.idx_email_logs_seller_id;
DROP INDEX IF EXISTS public.idx_system_alerts_unack;
DROP INDEX IF EXISTS public.idx_system_alerts_type;
DROP INDEX IF EXISTS public.idx_invariant_snapshots_balanced;
DROP INDEX IF EXISTS public.idx_system_alerts_seller_id;
DROP INDEX IF EXISTS public.idx_email_logs_status;
DROP INDEX IF EXISTS public.idx_seller_requests_user_id;
DROP INDEX IF EXISTS public.idx_seller_requests_seller_id;
DROP INDEX IF EXISTS public.idx_seller_applications_reviewed_by;
DROP INDEX IF EXISTS public.idx_seller_applications_linked_seller_id;
DROP INDEX IF EXISTS public.idx_orders_promotion_id;
DROP INDEX IF EXISTS public.idx_telegram_message_logs_seller_id;
DROP INDEX IF EXISTS public.idx_telegram_message_queue_seller_id;
DROP INDEX IF EXISTS public.idx_reserve_releases_seller_id;
DROP INDEX IF EXISTS public.idx_reserve_releases_transfer_id;
DROP INDEX IF EXISTS public.idx_disputes_seller_id;
DROP INDEX IF EXISTS public.idx_product_reviews_seller_id;
DROP INDEX IF EXISTS public.idx_system_alerts_acknowledged_by;
DROP INDEX IF EXISTS public.idx_runbooks_last_updated_by;
DROP INDEX IF EXISTS public.idx_disputes_order_id;
DROP INDEX IF EXISTS public.idx_admin_audit_logs_admin_id;
DROP INDEX IF EXISTS public.idx_product_reviews_buyer_id;
DROP INDEX IF EXISTS public.idx_audit_logs_store_id;
DROP INDEX IF EXISTS public.idx_previews_expires_at;

COMMIT;

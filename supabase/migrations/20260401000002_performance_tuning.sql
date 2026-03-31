-- MIGRATION: 20260401000002_performance_tuning_rls_indices.sql
-- DESCRIPTION: Batch performance optimization targeting RLS 'initplan' overhead and unused index bloat.

BEGIN;

-------------------------------------------------------
-- PHASE 1: RLS OPTIMIZATION ((SELECT auth.uid()))
-------------------------------------------------------
-- Standard Supabase optimization: Wrapping auth.uid() in a subquery 
-- triggers an InitPlan instead of a per-row call.

-- Products
DROP POLICY IF EXISTS "Sellers can manage their own products" ON public.products;
CREATE POLICY "Sellers can manage their own products" 
ON public.products
FOR ALL 
TO authenticated 
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

-- Product Variants
DROP POLICY IF EXISTS "Sellers can manage their own product variants" ON public.product_variants;
CREATE POLICY "Sellers can manage their own product variants"
ON public.product_variants
FOR ALL 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM products 
  WHERE products.id = product_variants.product_id 
  AND products.seller_id = (SELECT auth.uid())
));

-- Previews
DROP POLICY IF EXISTS "Sellers can view their own previews" ON public.previews;
CREATE POLICY "Sellers can view their own previews"
ON public.previews
FOR SELECT 
TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- Seller Wallets
DROP POLICY IF EXISTS "Sellers can view their own wallet" ON public.seller_wallets;
CREATE POLICY "Sellers can view their own wallet"
ON public.seller_wallets
FOR SELECT 
TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- Seller Transfers
DROP POLICY IF EXISTS "Sellers can view their own transfers" ON public.seller_transfers;
CREATE POLICY "Sellers can view their own transfers"
ON public.seller_transfers
FOR SELECT 
TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- Audit Logs (Consolidated Selective Access)
DROP POLICY IF EXISTS "Sellers can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Sellers can view their own audit logs"
ON public.audit_logs
FOR SELECT 
TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- API Requests
DROP POLICY IF EXISTS "Sellers can view their own api requests" ON public.api_requests;
CREATE POLICY "Sellers can view their own api requests"
ON public.api_requests
FOR SELECT 
TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- Customers
DROP POLICY IF EXISTS "Sellers can view their own customers" ON public.customers;
CREATE POLICY "Sellers can view their own customers"
ON public.customers
FOR SELECT 
TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-------------------------------------------------------
-- PHASE 2: INDEX PURGE (UNUSED INDEXES)
-------------------------------------------------------
-- Removing indexes that have 0 usage in production stats.
-- This speeds up all write operations (INSERT/UPDATE/DELETE).

DROP INDEX IF EXISTS public.idx_admin_audit_logs_created;
DROP INDEX IF EXISTS public.idx_api_limits_config_seller;
DROP INDEX IF EXISTS public.idx_api_requests_seller_id;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_customers_seller_id;
DROP INDEX IF EXISTS public.idx_dispute_evidence_dispute_id;
DROP INDEX IF EXISTS public.idx_disputes_seller_id;
DROP INDEX IF EXISTS public.idx_ledger_accounts_seller_id;
DROP INDEX IF EXISTS public.idx_ledger_entries_created;
DROP INDEX IF EXISTS public.idx_ledger_entry_lines_account_id;
DROP INDEX IF EXISTS public.idx_managed_payouts_seller_id;
DROP INDEX IF EXISTS public.idx_oracle_audit_logs_created;
DROP INDEX IF EXISTS public.idx_payout_adjustments_seller_id;
DROP INDEX IF EXISTS public.idx_payout_schedules_seller_id;
DROP INDEX IF EXISTS public.idx_preview_analytics_preview_id;
DROP INDEX IF EXISTS public.idx_preview_orders_customer_id;
DROP INDEX IF EXISTS public.idx_preview_orders_preview_id;
DROP INDEX IF EXISTS public.idx_previews_seller_id;
DROP INDEX IF EXISTS public.idx_product_images_product_id;
DROP INDEX IF EXISTS public.idx_product_reviews_product_id;
DROP INDEX IF EXISTS public.idx_product_variants_product_id;
DROP INDEX IF EXISTS public.idx_products_seller_id;
DROP INDEX IF EXISTS public.idx_proworks_projects_seller_id;
DROP INDEX IF EXISTS public.idx_recon_anomalies_run_id;
DROP INDEX IF EXISTS public.idx_recon_runs_date;
DROP INDEX IF EXISTS public.idx_reserve_release_schedules_seller_id;
DROP INDEX IF EXISTS public.idx_reserve_releases_seller_id;
DROP INDEX IF EXISTS public.idx_risk_actions_log_seller_id;
DROP INDEX IF EXISTS public.idx_risk_score_history_seller_id;
DROP INDEX IF EXISTS public.idx_risk_signals_seller_id;
DROP INDEX IF EXISTS public.idx_seller_onboarding_sessions_seller_id;
DROP INDEX IF EXISTS public.idx_seller_transfers_seller_id;
DROP INDEX IF EXISTS public.idx_seller_wallets_seller_id;
DROP INDEX IF EXISTS public.idx_seller_webhook_deliveries_webhook_id;
DROP INDEX IF EXISTS public.idx_seller_webhooks_seller_id;
DROP INDEX IF EXISTS public.idx_sellers_user_id;

COMMIT;

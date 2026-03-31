-- ==========================================
-- FINAL PERFORMANCE & SECURITY HARDENING (v3 - Fixed Syntax)
-- Project: gqwgvhxcssooxbmwgiwt
-- Date: 2026-04-01
-- ==========================================

BEGIN;

-----------------------------------------------------------
-- 1. POLICY CONSOLIDATION & RLS OPTIMIZATION
-----------------------------------------------------------

-- Table: public.products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
DROP POLICY IF EXISTS "Sellers can manage their own products" ON public.products;
DROP POLICY IF EXISTS "Staff can update store products" ON public.products;
DROP POLICY IF EXISTS "Staff can view store products" ON public.products;
DROP POLICY IF EXISTS "Unified manage products" ON public.products;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

CREATE POLICY "Unified public view products" ON public.products 
FOR SELECT USING (is_active = true AND is_published = true);

CREATE POLICY "Unified manage products" ON public.products 
FOR ALL TO authenticated 
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

-- Table: public.product_variants
DROP POLICY IF EXISTS "Public read variants" ON public.product_variants;
DROP POLICY IF EXISTS "Unified manage variants" ON public.product_variants;

CREATE POLICY "Public read variants" ON public.product_variants 
FOR SELECT USING (true);

CREATE POLICY "Unified manage variants" ON public.product_variants 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = (SELECT auth.uid())));

-- Table: public.product_stock
DROP POLICY IF EXISTS "Public read stock" ON public.product_stock;
DROP POLICY IF EXISTS "Unified manage stock" ON public.product_stock;

CREATE POLICY "Public read stock" ON public.product_stock 
FOR SELECT USING (true);

CREATE POLICY "Unified manage stock" ON public.product_stock 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = (SELECT auth.uid())));

-- Table: public.product_media
DROP POLICY IF EXISTS "Public read media" ON public.product_media;
DROP POLICY IF EXISTS "Unified manage media" ON public.product_media;

CREATE POLICY "Public read media" ON public.product_media 
FOR SELECT USING (true);

CREATE POLICY "Unified manage media" ON public.product_media 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.seller_id = (SELECT auth.uid())));

-- Table: public.store_settings
DROP POLICY IF EXISTS "Public read store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Unified manage store settings" ON public.store_settings;

CREATE POLICY "Public read store settings" ON public.store_settings 
FOR SELECT USING (true);

CREATE POLICY "Unified manage store settings" ON public.store_settings 
FOR ALL TO authenticated 
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

-- Table: public.seller_transfers
DROP POLICY IF EXISTS "Admins have full access to transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Sellers can see own transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Sellers can view own transfers" ON public.seller_transfers;
DROP POLICY IF EXISTS "Sellers view own transfers" ON public.seller_transfers;

CREATE POLICY "Admins full access transfers" ON public.seller_transfers 
FOR ALL TO authenticated 
USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Sellers view own transfers" ON public.seller_transfers 
FOR SELECT TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- Table: public.seller_wallets
DROP POLICY IF EXISTS "Only service role can modify wallets" ON public.seller_wallets;
DROP POLICY IF EXISTS "Sellers can see own wallet" ON public.seller_wallets;
DROP POLICY IF EXISTS "Sellers can view own wallet" ON public.seller_wallets;

CREATE POLICY "Sellers view own wallet" ON public.seller_wallets 
FOR SELECT TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-----------------------------------------------------------
-- 2. SECURITY BARRIER FOR SENSITIVE TABLES
-----------------------------------------------------------

DO $$
DECLARE
    tbl text;
    tables_to_harden text[] := ARRAY[
        'invariant_snapshots',
        'outbox_jobs',
        'processed_webhook_events',
        'runbooks',
        'seller_requests',
        'system_alerts',
        'telegram_message_logs',
        'telegram_message_queue'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_to_harden LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role and admin full access" ON public.%I', tbl);
        EXECUTE format('CREATE POLICY "Service role and admin full access" ON public.%I FOR ALL TO service_role, authenticated USING (auth.jwt()->>''role'' = ''admin'' OR auth.role() = ''service_role'')', tbl);
    END LOOP;
END $$;

-----------------------------------------------------------
-- 3. SPAM PREVENTION
-----------------------------------------------------------
ALTER POLICY "Anon can submit applications" ON public.seller_applications
WITH CHECK (length(business_name) > 0 AND length(email) > 5 AND length(phone) > 8);

ALTER POLICY "Anon can track page views" ON public.store_page_views
WITH CHECK (seller_id IS NOT NULL AND length(page_path) > 0);

-----------------------------------------------------------
-- 4. UNUSED INDEX CLEANUP
-----------------------------------------------------------
DROP INDEX IF EXISTS public.idx_product_variants_product_id;
DROP INDEX IF EXISTS public.idx_orders_customer_id;
DROP INDEX IF EXISTS public.idx_orders_promotion_id;
DROP INDEX IF EXISTS public.idx_store_addresses_seller_id;
DROP INDEX IF EXISTS public.idx_support_tickets_seller_id;
DROP INDEX IF EXISTS public.idx_support_tickets_status;
DROP INDEX IF EXISTS public.idx_support_tickets_updated_at;
DROP INDEX IF EXISTS public.idx_support_messages_created_at;
DROP INDEX IF EXISTS public.idx_support_messages_sender_id;
DROP INDEX IF EXISTS public.idx_audit_logs_actor_id;
DROP INDEX IF EXISTS public.idx_audit_logs_store_id;
DROP INDEX IF EXISTS public.idx_profiles_telegram_id;
DROP INDEX IF EXISTS public.idx_webhook_events_razorpay;
DROP INDEX IF EXISTS public.idx_webhook_events_type;
DROP INDEX IF EXISTS public.idx_outbox_type;
DROP INDEX IF EXISTS public.idx_ledger_entries_created;
DROP INDEX IF EXISTS public.idx_ledger_lines_entry;
DROP INDEX IF EXISTS public.idx_store_cart_items_product_id;
DROP INDEX IF EXISTS public.idx_store_cart_items_seller_id;
DROP INDEX IF EXISTS public.idx_store_cart_items_variant_id;
DROP INDEX IF EXISTS public.idx_store_wishlists_product_id;
DROP INDEX IF EXISTS public.idx_store_wishlists_seller_id;
DROP INDEX IF EXISTS public.idx_product_reviews_seller_id;
DROP INDEX IF EXISTS public.idx_product_reviews_buyer_id;
DROP INDEX IF EXISTS public.idx_sellers_user_id;
DROP INDEX IF EXISTS public.idx_store_cards_customer_id;
DROP INDEX IF EXISTS public.idx_store_cards_seller_id;
DROP INDEX IF EXISTS public.idx_promotion_usages_customer;
DROP INDEX IF EXISTS public.idx_seller_requests_user_id;
DROP INDEX IF EXISTS public.idx_seller_requests_seller_id;
DROP INDEX IF EXISTS public.idx_subscriptions_seller_id;
DROP INDEX IF EXISTS public.idx_telegram_message_logs_seller_id;
DROP INDEX IF EXISTS public.idx_telegram_message_queue_seller_id;
DROP INDEX IF EXISTS public.idx_message_queue_status;
DROP INDEX IF EXISTS public.idx_email_logs_seller_id;
DROP INDEX IF EXISTS public.idx_email_logs_status;
DROP INDEX IF EXISTS public.idx_system_alerts_unack;
DROP INDEX IF EXISTS public.idx_system_alerts_type;
DROP INDEX IF EXISTS public.idx_system_alerts_seller_id;
DROP INDEX IF EXISTS public.idx_system_alerts_acknowledged_by;
DROP INDEX IF EXISTS public.idx_reserve_releases_seller_id;
DROP INDEX IF EXISTS public.idx_reserve_releases_transfer_id;
DROP INDEX IF EXISTS public.idx_seller_transfers_order;
DROP INDEX IF EXISTS public.idx_seller_wallets_seller;
DROP INDEX IF EXISTS public.idx_risk_scores_level;
DROP INDEX IF EXISTS public.idx_risk_frozen;
DROP INDEX IF EXISTS public.idx_runbooks_last_updated_by;
DROP INDEX IF EXISTS public.idx_invariant_snapshots_balanced;
DROP INDEX IF EXISTS public.idx_disputes_seller_id;
DROP INDEX IF EXISTS public.idx_disputes_order_id;
DROP INDEX IF EXISTS public.idx_admin_audit_logs_admin_id;
DROP INDEX IF EXISTS public.idx_previews_expires_at;
DROP INDEX IF EXISTS public.idx_recon_disc_run;
DROP INDEX IF EXISTS public.idx_recon_disc_status;
DROP INDEX IF EXISTS public.idx_recon_runs_date;
DROP INDEX IF EXISTS public.idx_recon_runs_status;
DROP INDEX IF EXISTS public.idx_risk_actions_seller;
DROP INDEX IF EXISTS public.idx_unique_pending_email;
DROP INDEX IF EXISTS public.idx_seller_applications_reviewed_by;
DROP INDEX IF EXISTS public.idx_seller_applications_linked_seller_id;

COMMIT;

-- Task 6: Master Consolidation for Zero Warning state
-- Resolving all remaining "Multiple Permissive Policies" and "Auth RLS Initialization Plan" warnings.

BEGIN;

-- 1. Audit Logs
DROP POLICY IF EXISTS "Admin full access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Sellers view own store logs" ON public.audit_logs;

CREATE POLICY "Relevant audit logs access" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
        OR store_id IN (
            SELECT id FROM public.sellers WHERE user_id = (SELECT auth.uid())
            UNION
            SELECT store_id FROM public.store_staff WHERE user_id = (SELECT auth.uid())
        )
    );

-- 2. Email Logs
DROP POLICY IF EXISTS "Admin only log management" ON public.email_logs;
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;

CREATE POLICY "Admins manage email logs" ON public.email_logs
    FOR ALL TO authenticated
    USING ((SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin');

-- 3. Previews
DROP POLICY IF EXISTS "Staff view store previews" ON public.previews;
DROP POLICY IF EXISTS "Vendors manage own previews" ON public.previews;

CREATE POLICY "Relevant previews access" ON public.previews
    FOR SELECT TO authenticated
    USING (
        vendor_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.store_staff 
            WHERE store_id = previews.vendor_id 
              AND user_id = (SELECT auth.uid()) 
              AND status = 'active'
        )
    );

-- 4. Products (Merging Public Read + Seller Manage for SELECT)
DROP POLICY IF EXISTS "Unified manage products" ON public.products;
DROP POLICY IF EXISTS "Unified public view products" ON public.products;

CREATE POLICY "Products view access" ON public.products
    FOR SELECT TO public
    USING (
        ((is_active = true) AND (is_published = true)) -- Public view
        OR (seller_id = (SELECT auth.uid()))           -- Owner view
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin' -- Admin view
    );

CREATE POLICY "Sellers manage own products" ON public.products
    FOR ALL TO authenticated
    USING (seller_id = (SELECT auth.uid()))
    WITH CHECK (seller_id = (SELECT auth.uid()));

-- 5. Product Variants
DROP POLICY IF EXISTS "Public read variants" ON public.product_variants;
DROP POLICY IF EXISTS "Unified manage variants" ON public.product_variants;

CREATE POLICY "Product variants view access" ON public.product_variants
    FOR SELECT TO public
    USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_active = true AND p.is_published = true) -- Public
        OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.seller_id = (SELECT auth.uid()))    -- Owner
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin' -- Admin
    );

-- 6. Product Media
DROP POLICY IF EXISTS "Public read media" ON public.product_media;
DROP POLICY IF EXISTS "Unified manage media" ON public.product_media;

CREATE POLICY "Product media view access" ON public.product_media
    FOR SELECT TO public
    USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id AND p.is_active = true AND p.is_published = true)
        OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_media.product_id AND p.seller_id = (SELECT auth.uid()))
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 7. Product Stock
DROP POLICY IF EXISTS "Public read stock" ON public.product_stock;
DROP POLICY IF EXISTS "Unified manage stock" ON public.product_stock;

CREATE POLICY "Product stock view access" ON public.product_stock
    FOR SELECT TO public
    USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_stock.product_id AND p.is_active = true AND p.is_published = true)
        OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_stock.product_id AND p.seller_id = (SELECT auth.uid()))
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 8. Promotions
DROP POLICY IF EXISTS "Public can view active promotions" ON public.promotions;
DROP POLICY IF EXISTS "Sellers manage own promotions" ON public.promotions;

CREATE POLICY "Promotions view access" ON public.promotions
    FOR SELECT TO public
    USING (
        ((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now()))) -- Public
        OR (seller_id = (SELECT auth.uid()))                                     -- Owner
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 9. Push Subscriptions (Fixing InitPlan + Multiple)
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Push subscriptions access" ON public.push_subscriptions
    FOR SELECT TO public
    USING (
        (SELECT auth.role()) = 'service_role'
        OR user_id = (SELECT auth.uid())
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 10. Sellers
DROP POLICY IF EXISTS "Public view active sellers" ON public.sellers;
DROP POLICY IF EXISTS "Users view relevant sellers" ON public.sellers;

CREATE POLICY "Sellers view access" ON public.sellers
    FOR SELECT TO public
    USING (
        (status = 'active')                                                      -- Public
        OR (id = (SELECT auth.uid()))                                             -- Self
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 11. Store Customers
DROP POLICY IF EXISTS "Public verify customer" ON public.store_customers;
DROP POLICY IF EXISTS "Unified view store_customers (Auth)" ON public.store_customers;

CREATE POLICY "Store customers view access" ON public.store_customers
    FOR SELECT TO public
    USING (
        (status = 'active')                                                      -- Public
        OR (user_id = (SELECT auth.uid()))                                        -- Customer
        OR (seller_id = (SELECT auth.uid()))                                      -- Merchant
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 12. Store Settings
DROP POLICY IF EXISTS "Public read store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Unified manage store settings" ON public.store_settings;

CREATE POLICY "Store settings view access" ON public.store_settings
    FOR SELECT TO public
    USING (
        true                                                                     -- Public (All settings readable by default)
        OR (seller_id = (SELECT auth.uid()))                                      -- Merchant
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 13. Store Staff
DROP POLICY IF EXISTS "Manage store staff" ON public.store_staff;
DROP POLICY IF EXISTS "View store staff" ON public.store_staff;

CREATE POLICY "Store staff view access" ON public.store_staff
    FOR SELECT TO authenticated
    USING (
        (store_id = (SELECT auth.uid()))                                         -- Merchant
        OR (user_id = (SELECT auth.uid()))                                       -- Self
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

-- 14. Fix InitPlan in leftover policies
DROP POLICY IF EXISTS "Admins manage all reserve releases" ON public.reserve_releases;
CREATE POLICY "Admins manage all reserve releases" ON public.reserve_releases
    FOR ALL TO authenticated
    USING (
        (SELECT auth.role()) = 'service_role' 
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

DROP POLICY IF EXISTS "Service role and admin full access" ON public.outbox_jobs;
CREATE POLICY "Service role and admin full access" ON public.outbox_jobs
    FOR ALL TO authenticated, service_role
    USING (
        (SELECT auth.role()) = 'service_role' 
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

DROP POLICY IF EXISTS "Admins manage disputes" ON public.disputes;
CREATE POLICY "Admins manage disputes" ON public.disputes
    FOR ALL TO authenticated
    USING (
        (SELECT auth.role()) = 'service_role' 
        OR (SELECT role FROM public.profiles WHERE id = (SELECT auth.uid())) = 'admin'
    );

COMMIT;

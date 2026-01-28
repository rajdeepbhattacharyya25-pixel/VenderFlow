-- PERFORMANCE OPTIMIZATIONS
-- 1. Fix Duplicate Indexes
-- 'store_customers_seller_email_unique' is likely the constraint we want to keep. 
-- Dropping the redundant index.
DROP INDEX IF EXISTS store_customers_email_seller_idx;

-- 2. Fix Unindexed Foreign Keys (Speed up Joins)
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_product_media_product_id ON product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_store_addresses_seller_id ON store_addresses(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_cards_customer_id ON store_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_cards_seller_id ON store_cards(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_cart_items_product_id ON store_cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_store_cart_items_seller_id ON store_cart_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_cart_items_variant_id ON store_cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_store_customers_user_id ON store_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlists_product_id ON store_wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_store_wishlists_seller_id ON store_wishlists(seller_id);

-- 3. Optimize RLS Policies (Cache auth.uid() call)
-- Changing `auth.uid()` to `(select auth.uid())` prevents per-row function execution

-- Products: Sellers manage own
DROP POLICY IF EXISTS "Sellers can manage own products" ON products;
CREATE POLICY "Sellers can manage own products" ON products FOR ALL TO authenticated 
USING (seller_id = (select auth.uid())) 
WITH CHECK (seller_id = (select auth.uid()));

-- Orders: Sellers view own
DROP POLICY IF EXISTS "Sellers view own store orders" ON orders;
CREATE POLICY "Sellers view own store orders" ON orders FOR SELECT TO authenticated 
USING (seller_id = (select auth.uid()));

-- Orders: Customers view own
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT TO authenticated 
USING (customer_id = (select auth.uid()));

-- Orders: Customers create own
DROP POLICY IF EXISTS "Customers can create own orders" ON orders;
CREATE POLICY "Customers can create own orders" ON orders FOR INSERT TO authenticated 
WITH CHECK (customer_id = (select auth.uid()));

-- Store Settings: Sellers manage own
DROP POLICY IF EXISTS "Sellers can manage their own settings" ON store_settings;
CREATE POLICY "Sellers can manage their own settings" ON store_settings FOR ALL TO authenticated 
USING (seller_id = (select auth.uid()))
WITH CHECK (seller_id = (select auth.uid()));


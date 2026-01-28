-- OPTIMIZE RLS POLICIES FOR ALL TABLES
-- Using (select auth.uid()) to prevent per-row re-evaluation

-- 1. PROFILES
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated USING (id = (select auth.uid()));

-- 2. SELLERS
DROP POLICY IF EXISTS "Sellers view own profile" ON sellers;
CREATE POLICY "Sellers view own profile" ON sellers FOR SELECT TO authenticated USING (id = (select auth.uid()));

-- 3. STORE_CUSTOMERS
DROP POLICY IF EXISTS "Sellers view own store customers" ON store_customers;
CREATE POLICY "Sellers view own store customers" ON store_customers FOR SELECT TO authenticated USING (seller_id IN (SELECT id FROM sellers WHERE id = (select auth.uid()))); -- Simplified check if seller_id is user's id? accessing sellers table might be recursive if not careful. Assuming seller_id in store_customers is the SELLER'S id, not the user's id. Wait, store_customers usually links user_id -> customer. 
-- Let's check schema assumption. store_customers(id, seller_id, user_id).
-- Sellers view customers of their store: seller_id = auth.uid()
-- Customers view their own record: user_id = auth.uid()

DROP POLICY IF EXISTS "Sellers view own store customers" ON store_customers;
CREATE POLICY "Sellers view own store customers" ON store_customers FOR SELECT TO authenticated USING (seller_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own profile" ON store_customers;
CREATE POLICY "Customers can view their own profile" ON store_customers FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can insert their own profile" ON store_customers;
CREATE POLICY "Customers can insert their own profile" ON store_customers FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can update their own profile" ON store_customers;
CREATE POLICY "Customers can update their own profile" ON store_customers FOR UPDATE TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Customers can join a store" ON store_customers;
CREATE POLICY "Customers can join a store" ON store_customers FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

-- 4. STORE_ADDRESSES
DROP POLICY IF EXISTS "Customers can manage their own addresses" ON store_addresses;
CREATE POLICY "Customers can manage their own addresses" ON store_addresses FOR ALL TO authenticated USING (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid()))) WITH CHECK (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid())));

-- 5. STORE_CARDS
DROP POLICY IF EXISTS "Users can manage their own cards" ON store_cards;
CREATE POLICY "Users can manage their own cards" ON store_cards FOR ALL TO authenticated USING (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid()))) WITH CHECK (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid())));

-- 6. STORE_CART_ITEMS
DROP POLICY IF EXISTS "Customers can manage their own cart" ON store_cart_items;
CREATE POLICY "Customers can manage their own cart" ON store_cart_items FOR ALL TO authenticated USING (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid()))) WITH CHECK (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid())));

-- 7. STORE_WISHLISTS
DROP POLICY IF EXISTS "Customers can manage their own wishlist" ON store_wishlists;
CREATE POLICY "Customers can manage their own wishlist" ON store_wishlists FOR ALL TO authenticated USING (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid()))) WITH CHECK (customer_id IN (SELECT id FROM store_customers WHERE user_id = (select auth.uid())));

-- 8. PRODUCT_STOCK
DROP POLICY IF EXISTS "Sellers can manage own stock" ON product_stock;
CREATE POLICY "Sellers can manage own stock" ON product_stock FOR ALL TO authenticated USING (product_id IN (SELECT id FROM products WHERE seller_id = (select auth.uid()))) WITH CHECK (product_id IN (SELECT id FROM products WHERE seller_id = (select auth.uid())));

-- 9. PRODUCT_VARIANTS
DROP POLICY IF EXISTS "Sellers can manage own variants" ON product_variants;
CREATE POLICY "Sellers can manage own variants" ON product_variants FOR ALL TO authenticated USING (product_id IN (SELECT id FROM products WHERE seller_id = (select auth.uid()))) WITH CHECK (product_id IN (SELECT id FROM products WHERE seller_id = (select auth.uid())));

-- 10. PRODUCT_MEDIA
DROP POLICY IF EXISTS "Sellers can manage own media" ON product_media;
CREATE POLICY "Sellers can manage own media" ON product_media FOR ALL TO authenticated USING (product_id IN (SELECT id FROM products WHERE seller_id = (select auth.uid()))) WITH CHECK (product_id IN (SELECT id FROM products WHERE seller_id = (select auth.uid())));

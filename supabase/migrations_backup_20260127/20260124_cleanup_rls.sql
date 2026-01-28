-- FIX RLS SECURITY AND PERFORMANCE
-- This migration consolidates duplicate policies, fixes performance issues with auth.uid(),
-- and enables RLS on the cart_recovery_logs table.

-- 1. Enable RLS on cart_recovery_logs
ALTER TABLE IF EXISTS cart_recovery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to cart logs"
  ON cart_recovery_logs
  FOR ALL
  TO authenticated
  USING (is_admin());

-- 2. Clean up ORDERS duplicates and optimize
-- Dropping duplicate/inefficient policies
DROP POLICY IF EXISTS "admin_manage_all_orders" ON orders;
DROP POLICY IF EXISTS "customer_create_own_order" ON orders;
DROP POLICY IF EXISTS "customer_view_own_orders" ON orders;
DROP POLICY IF EXISTS "seller_view_store_orders" ON orders;
DROP POLICY IF EXISTS "seller_update_store_orders" ON orders;
-- Drop potentially conflicting "Sellers" policies to standardize on "Sellers view own store orders"
DROP POLICY IF EXISTS "Sellers can view store orders" ON orders;
DROP POLICY IF EXISTS "Sellers can update store orders" ON orders;

-- Ensure specialized policies exist and are optimized
-- (Check if they exist first or just CREATE OR REPLACE via DROP/CREATE)

-- Admin
DROP POLICY IF EXISTS "Admin full access to orders" ON orders;
CREATE POLICY "Admin full access to orders" ON orders FOR ALL TO authenticated USING (is_admin());

-- Customers Create
DROP POLICY IF EXISTS "Customers can create own orders" ON orders;
CREATE POLICY "Customers can create own orders" ON orders FOR INSERT TO authenticated 
WITH CHECK (customer_id = (SELECT auth.uid()));

-- Customers View
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT TO authenticated 
USING (customer_id = (SELECT auth.uid()));

-- Sellers View
DROP POLICY IF EXISTS "Sellers view own store orders" ON orders;
CREATE POLICY "Sellers view own store orders" ON orders FOR SELECT TO authenticated 
USING (seller_id = (SELECT auth.uid()));

-- Sellers Update
CREATE POLICY "Sellers can update own store orders" ON orders FOR UPDATE TO authenticated
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));


-- 3. Clean up PRODUCTS duplicates
DROP POLICY IF EXISTS "admin_manage_all_products" ON products;
DROP POLICY IF EXISTS "Sellers manage own products" ON products; -- Keeping "Sellers can manage own products"
DROP POLICY IF EXISTS "public_view_published_products" ON products;

-- Ensure standardized policies
DROP POLICY IF EXISTS "Admin manage all products" ON products;
CREATE POLICY "Admin manage all products" ON products FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Sellers can manage own products" ON products;
CREATE POLICY "Sellers can manage own products" ON products FOR ALL TO authenticated 
USING (seller_id = (SELECT auth.uid()))
WITH CHECK (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Public can view published products" ON products;
CREATE POLICY "Public can view published products" ON products FOR SELECT TO public 
USING (is_active = true AND is_published = true);

-- 4. Clean up SELLERS duplicates
DROP POLICY IF EXISTS "Admin full access to sellers" ON sellers;
-- Recreate correctly constrained to authenticated
CREATE POLICY "Admin full access to sellers" ON sellers FOR ALL TO authenticated USING (is_admin());

-- "Public can view active sellers" should stay for public, but ensure it's optimal.
DROP POLICY IF EXISTS "Public can view active sellers" ON sellers;
CREATE POLICY "Public can view active sellers" ON sellers FOR SELECT TO public USING (status = 'active');

DROP POLICY IF EXISTS "Sellers view own profile" ON sellers;
CREATE POLICY "Sellers view own profile" ON sellers FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));


-- 5. Clean up STORE CUSTOMERS duplicates
DROP POLICY IF EXISTS "Admin full access to store_customers" ON store_customers;
CREATE POLICY "Admin full access to store_customers" ON store_customers FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Public can verify customer exists" ON store_customers;
CREATE POLICY "Public can verify customer exists" ON store_customers FOR SELECT TO public USING (status = 'active');


-- 6. Clean up dependent tables (Media, Stock, Variants)
-- Only drop the known weak/duplicate ones if exact names are known or just broad cleanup.
-- The warnings listed "Public can read media" and "Sellers can manage own media".
-- "Authenticated users can read media" vs "Sellers can manage own media".
-- If generic "Authenticated users can read..." exists, it conflicts with stricter seller policies if both allow different things or same things.
-- Better to have specific policies.

-- PRODUCT MEDIA
DROP POLICY IF EXISTS "Authenticated can manage media" ON product_media; 
DROP POLICY IF EXISTS "Anon can manage media" ON product_media;
DROP POLICY IF EXISTS "Public can read media" ON product_media;
DROP POLICY IF EXISTS "Sellers can manage own media" ON product_media;

CREATE POLICY "Public can read media" ON product_media FOR SELECT TO public USING (true);
CREATE POLICY "Sellers can manage own media" ON product_media FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.seller_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.seller_id = (SELECT auth.uid())));

-- PRODUCT STOCK
DROP POLICY IF EXISTS "Authenticated users can read stock" ON product_stock;
DROP POLICY IF EXISTS "Sellers can manage own stock" ON product_stock;

CREATE POLICY "Public can read stock" ON product_stock FOR SELECT TO public USING (true);
CREATE POLICY "Sellers can manage own stock" ON product_stock FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_stock.product_id AND products.seller_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_stock.product_id AND products.seller_id = (SELECT auth.uid())));

-- PRODUCT VARIANTS
DROP POLICY IF EXISTS "Authenticated users can read variants" ON product_variants;
DROP POLICY IF EXISTS "Sellers can manage own variants" ON product_variants;

CREATE POLICY "Public can read variants" ON product_variants FOR SELECT TO public USING (true);
CREATE POLICY "Sellers can manage own variants" ON product_variants FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.seller_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.seller_id = (SELECT auth.uid())));


-- 7. CLEANUP RLS PART 2
-- Removing remaining permissive/duplicate policies

-- PRODUCTS
-- This policy allowed authenticated users to see ALL products (even unpublished).
DROP POLICY IF EXISTS "Authenticated users can read products" ON products;

-- STORE_CUSTOMERS
-- Duplicate of "Customers can insert their own profile"
DROP POLICY IF EXISTS "Customers can join a store" ON store_customers;

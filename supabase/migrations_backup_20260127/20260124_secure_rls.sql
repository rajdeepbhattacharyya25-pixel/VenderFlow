-- Secure RLS Policies
-- Removing policies that allow full access to Anon/Authenticated without checks

-- 1. PRODUCTS
DROP POLICY IF EXISTS "Admin can manage products" ON products;
DROP POLICY IF EXISTS "Anon can manage products" ON products;

-- Sellers can manage their own products
CREATE POLICY "Sellers can manage own products" 
ON products FOR ALL 
TO authenticated 
USING (seller_id = auth.uid()) 
WITH CHECK (seller_id = auth.uid());

-- Public can view active products (already likely exists as "public_view_published_products" or similar, but reinforcing)
-- (Leaving existing SELECT policies for now to avoid breaking storefront, relying on removing the 'ALL' ones)


-- 2. PRODUCT VARIANTS
DROP POLICY IF EXISTS "Admin can manage variants" ON product_variants;
DROP POLICY IF EXISTS "Anon can manage variants" ON product_variants;

-- Sellers can manage variants of their own products
CREATE POLICY "Sellers can manage own variants" 
ON product_variants FOR ALL 
TO authenticated 
USING ( EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.seller_id = auth.uid()) )
WITH CHECK ( EXISTS (SELECT 1 FROM products WHERE products.id = product_variants.product_id AND products.seller_id = auth.uid()) );


-- 3. PRODUCT STOCK
DROP POLICY IF EXISTS "Admin can manage stock" ON product_stock;
DROP POLICY IF EXISTS "Anon can manage stock" ON product_stock;

-- Sellers can manage stock of their own products
CREATE POLICY "Sellers can manage own stock" 
ON product_stock FOR ALL 
TO authenticated 
USING ( EXISTS (SELECT 1 FROM products WHERE products.id = product_stock.product_id AND products.seller_id = auth.uid()) )
WITH CHECK ( EXISTS (SELECT 1 FROM products WHERE products.id = product_stock.product_id AND products.seller_id = auth.uid()) );


-- 4. PRODUCT MEDIA
DROP POLICY IF EXISTS "Authenticated can manage media" ON product_media;
DROP POLICY IF EXISTS "Anon can manage media" ON product_media;

-- Sellers can manage media of their own products
CREATE POLICY "Sellers can manage own media" 
ON product_media FOR ALL 
TO authenticated 
USING ( EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.seller_id = auth.uid()) )
WITH CHECK ( EXISTS (SELECT 1 FROM products WHERE products.id = product_media.product_id AND products.seller_id = auth.uid()) );


-- 5. ORDERS
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;

-- Customers can create their own orders
CREATE POLICY "Customers can create own orders" 
ON orders FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = customer_id);

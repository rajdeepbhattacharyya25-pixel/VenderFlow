-- Task 5: Cleanup unused indexes
-- Removing redundant indexes to stay within the 30% unused threshold

BEGIN;

-- 1. Drop idx_products_seller_id (Unused, redundant)
DROP INDEX IF EXISTS public.idx_products_seller_id;

-- 2. Drop idx_orders_customer_id (Unused, redundant)
DROP INDEX IF EXISTS public.idx_orders_customer_id;

-- 3. Drop idx_store_cart_items_customer_id (Unused, redundant)
DROP INDEX IF EXISTS public.idx_store_cart_items_customer_id;

COMMIT;

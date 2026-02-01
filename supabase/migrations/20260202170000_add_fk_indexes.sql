-- Migration: Add indexes for unindexed foreign keys
-- DATE: 2026-02-02
-- These indexes improve JOIN and DELETE performance on foreign key columns
-- 1. announcements.created_by
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON public.announcements(created_by);
-- 2. orders.customer_id
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
-- 3. products.seller_id
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
-- 4. store_staff.created_by
CREATE INDEX IF NOT EXISTS idx_store_staff_created_by ON public.store_staff(created_by);
-- 5. support_messages.sender_id
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON public.support_messages(sender_id);
-- 6. user_sessions.user_id
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
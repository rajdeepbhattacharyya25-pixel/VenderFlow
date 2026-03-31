-- Add missing indexes based on Supabase performance advisor warnings for unindexed foreign keys

CREATE INDEX IF NOT EXISTS idx_system_alerts_seller_id ON public.system_alerts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_requests_user_id ON public.seller_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_requests_seller_id ON public.seller_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_reviewed_by ON public.seller_applications(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_seller_applications_linked_seller_id ON public.seller_applications(linked_seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_promotion_id ON public.orders(promotion_id);
CREATE INDEX IF NOT EXISTS idx_telegram_message_logs_seller_id ON public.telegram_message_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_telegram_message_queue_seller_id ON public.telegram_message_queue(seller_id);
CREATE INDEX IF NOT EXISTS idx_reserve_releases_seller_id ON public.reserve_releases(seller_id);
CREATE INDEX IF NOT EXISTS idx_reserve_releases_transfer_id ON public.reserve_releases(transfer_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_seller_id ON public.product_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_acknowledged_by ON public.system_alerts(acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_runbooks_last_updated_by ON public.runbooks(last_updated_by);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_buyer_id ON public.product_reviews(buyer_id);

-- Task 1: Create covering indexes for unindexed foreign keys
-- Identified by Supabase Performance Advisor

-- admin_audit_logs
CREATE INDEX IF NOT EXISTS admin_audit_logs_admin_id_idx ON public.admin_audit_logs (admin_id);

-- audit_logs
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_store_id_idx ON public.audit_logs (store_id);

-- disputes
CREATE INDEX IF NOT EXISTS disputes_order_id_idx ON public.disputes (order_id);
CREATE INDEX IF NOT EXISTS disputes_seller_id_idx ON public.disputes (seller_id);

-- email_logs
CREATE INDEX IF NOT EXISTS email_logs_seller_id_idx ON public.email_logs (seller_id);

-- ledger_entry_lines
CREATE INDEX IF NOT EXISTS ledger_entry_lines_entry_id_idx ON public.ledger_entry_lines (entry_id);

-- orders
CREATE INDEX IF NOT EXISTS orders_customer_id_idx ON public.orders (customer_id);
CREATE INDEX IF NOT EXISTS orders_promotion_id_idx ON public.orders (promotion_id);

-- product_reviews
CREATE INDEX IF NOT EXISTS product_reviews_buyer_id_idx ON public.product_reviews (buyer_id);
CREATE INDEX IF NOT EXISTS product_reviews_seller_id_idx ON public.product_reviews (seller_id);

-- product_variants
CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON public.product_variants (product_id);

-- reconciliation_discrepancies
CREATE INDEX IF NOT EXISTS reconciliation_discrepancies_run_id_idx ON public.reconciliation_discrepancies (run_id);

-- reserve_releases
CREATE INDEX IF NOT EXISTS reserve_releases_seller_id_idx ON public.reserve_releases (seller_id);
CREATE INDEX IF NOT EXISTS reserve_releases_transfer_id_idx ON public.reserve_releases (transfer_id);

-- risk_actions_log
CREATE INDEX IF NOT EXISTS risk_actions_log_seller_id_idx ON public.risk_actions_log (seller_id);

-- runbooks
CREATE INDEX IF NOT EXISTS runbooks_last_updated_by_idx ON public.runbooks (last_updated_by);

-- seller_applications
CREATE INDEX IF NOT EXISTS seller_applications_linked_seller_id_idx ON public.seller_applications (linked_seller_id);
CREATE INDEX IF NOT EXISTS seller_applications_reviewed_by_idx ON public.seller_applications (reviewed_by);

-- seller_requests
CREATE INDEX IF NOT EXISTS seller_requests_seller_id_idx ON public.seller_requests (seller_id);
CREATE INDEX IF NOT EXISTS seller_requests_user_id_idx ON public.seller_requests (user_id);

-- seller_transfers
CREATE INDEX IF NOT EXISTS seller_transfers_order_id_idx ON public.seller_transfers (order_id);

-- store_addresses
CREATE INDEX IF NOT EXISTS store_addresses_seller_id_idx ON public.store_addresses (seller_id);

-- store_cards
CREATE INDEX IF NOT EXISTS store_cards_customer_id_idx ON public.store_cards (customer_id);
CREATE INDEX IF NOT EXISTS store_cards_seller_id_idx ON public.store_cards (seller_id);

-- store_cart_items
CREATE INDEX IF NOT EXISTS store_cart_items_product_id_idx ON public.store_cart_items (product_id);
CREATE INDEX IF NOT EXISTS store_cart_items_seller_id_idx ON public.store_cart_items (seller_id);
CREATE INDEX IF NOT EXISTS store_cart_items_variant_id_idx ON public.store_cart_items (variant_id);

-- store_wishlists
CREATE INDEX IF NOT EXISTS store_wishlists_product_id_idx ON public.store_wishlists (product_id);
CREATE INDEX IF NOT EXISTS store_wishlists_seller_id_idx ON public.store_wishlists (seller_id);

-- subscriptions
CREATE INDEX IF NOT EXISTS subscriptions_seller_id_idx ON public.subscriptions (seller_id);

-- support_messages
CREATE INDEX IF NOT EXISTS support_messages_sender_id_idx ON public.support_messages (sender_id);

-- support_tickets
CREATE INDEX IF NOT EXISTS support_tickets_seller_id_idx ON public.support_tickets (seller_id);

-- system_alerts
CREATE INDEX IF NOT EXISTS system_alerts_acknowledged_by_idx ON public.system_alerts (acknowledged_by);
CREATE INDEX IF NOT EXISTS system_alerts_seller_id_idx ON public.system_alerts (seller_id);

-- telegram_message_logs
CREATE INDEX IF NOT EXISTS telegram_message_logs_seller_id_idx ON public.telegram_message_logs (seller_id);

-- telegram_message_queue
CREATE INDEX IF NOT EXISTS telegram_message_queue_seller_id_idx ON public.telegram_message_queue (seller_id);

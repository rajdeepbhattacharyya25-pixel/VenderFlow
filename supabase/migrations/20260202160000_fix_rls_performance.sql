-- Migration: Fix RLS Performance Issues (auth_rls_initplan)
-- DATE: 2026-02-02
-- This migration optimizes RLS policies by wrapping auth.uid() in a subselect
-- to prevent per-row re-evaluation.
-- =========================================================================
-- 1. notifications
-- =========================================================================
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
CREATE POLICY "Enable insert for authenticated users" ON public.notifications FOR
INSERT TO authenticated WITH CHECK (
        (
            select auth.uid()
        ) = user_id
    );
-- =========================================================================
-- 2. support_tickets
-- =========================================================================
DROP POLICY IF EXISTS "Unified insert tickets" ON public.support_tickets;
CREATE POLICY "Unified insert tickets" ON public.support_tickets FOR
INSERT TO authenticated WITH CHECK (
        (
            select auth.uid()
        ) = seller_id
    );
DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets" ON public.support_tickets FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (
                    select auth.uid()
                )
                AND role = 'admin'
        )
    );
-- =========================================================================
-- 3. seller_telegram_configs
-- =========================================================================
DROP POLICY IF EXISTS "Sellers can view own telegram config" ON public.seller_telegram_configs;
CREATE POLICY "Sellers can view own telegram config" ON public.seller_telegram_configs FOR
SELECT TO authenticated USING (
        (
            select auth.uid()
        ) = seller_id
    );
DROP POLICY IF EXISTS "Sellers can create own telegram config" ON public.seller_telegram_configs;
CREATE POLICY "Sellers can create own telegram config" ON public.seller_telegram_configs FOR
INSERT TO authenticated WITH CHECK (
        (
            select auth.uid()
        ) = seller_id
    );
DROP POLICY IF EXISTS "Sellers can update own telegram config" ON public.seller_telegram_configs;
CREATE POLICY "Sellers can update own telegram config" ON public.seller_telegram_configs FOR
UPDATE TO authenticated USING (
        (
            select auth.uid()
        ) = seller_id
    );
DROP POLICY IF EXISTS "Sellers can delete own telegram config" ON public.seller_telegram_configs;
CREATE POLICY "Sellers can delete own telegram config" ON public.seller_telegram_configs FOR DELETE TO authenticated USING (
    (
        select auth.uid()
    ) = seller_id
);
-- =========================================================================
-- 4. platform_settings
-- =========================================================================
DROP POLICY IF EXISTS "Allow admin update access" ON public.platform_settings;
CREATE POLICY "Allow admin update access" ON public.platform_settings FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (
                    select auth.uid()
                )
                AND role = 'admin'
        )
    );
-- =========================================================================
-- 5. seller_invites
-- =========================================================================
DROP POLICY IF EXISTS "Admins can view all invites" ON public.seller_invites;
CREATE POLICY "Admins can view all invites" ON public.seller_invites FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (
                    select auth.uid()
                )
                AND role = 'admin'
        )
    );
DROP POLICY IF EXISTS "Admins can insert invites" ON public.seller_invites;
CREATE POLICY "Admins can insert invites" ON public.seller_invites FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE id = (
                    select auth.uid()
                )
                AND role = 'admin'
        )
    );
-- =========================================================================
-- 6. user_sessions
-- =========================================================================
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.user_sessions;
CREATE POLICY "Users can view their own sessions" ON public.user_sessions FOR
SELECT TO authenticated USING (
        (
            select auth.uid()
        ) = user_id
    );
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.user_sessions;
CREATE POLICY "Users can insert their own sessions" ON public.user_sessions FOR
INSERT TO authenticated WITH CHECK (
        (
            select auth.uid()
        ) = user_id
    );
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.user_sessions;
CREATE POLICY "Users can delete their own sessions" ON public.user_sessions FOR DELETE TO authenticated USING (
    (
        select auth.uid()
    ) = user_id
);
-- =========================================================================
-- 7. store_staff
-- =========================================================================
DROP POLICY IF EXISTS "Sellers can view their own staff" ON public.store_staff;
DROP POLICY IF EXISTS "Sellers can manage their own staff" ON public.store_staff;
DROP POLICY IF EXISTS "Staff can view themselves" ON public.store_staff;
-- Consolidate into single policy for SELECT
CREATE POLICY "View store staff" ON public.store_staff FOR
SELECT TO authenticated USING (
        (
            select auth.uid()
        ) = store_id
        OR (
            select auth.uid()
        ) = user_id
    );
-- Consolidate into single policy for ALL management
CREATE POLICY "Manage store staff" ON public.store_staff FOR ALL TO authenticated USING (
    (
        select auth.uid()
    ) = store_id
) WITH CHECK (
    (
        select auth.uid()
    ) = store_id
);
-- =========================================================================
-- 8. products (Staff policies)
-- =========================================================================
DROP POLICY IF EXISTS "Staff can view store products" ON public.products;
DROP POLICY IF EXISTS "Staff can update store products" ON public.products;
-- More efficient staff policy using subselect
CREATE POLICY "Staff can view store products" ON public.products FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.store_staff
            WHERE store_staff.user_id = (
                    select auth.uid()
                )
                AND store_staff.store_id = products.seller_id
        )
    );
CREATE POLICY "Staff can update store products" ON public.products FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.store_staff
            WHERE store_staff.user_id = (
                    select auth.uid()
                )
                AND store_staff.store_id = products.seller_id
        )
    );
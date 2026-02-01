-- Migration: Fix Database Security Issues (Lint Warnings)
-- DATE: 2026-02-02
-- 1. Fix Mutable Search Paths (Security Definer Functions)
-- Setting explicit search_path prevents malicious code substitution
ALTER FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT)
SET search_path = public;
ALTER FUNCTION public.notify_seller_new_customer()
SET search_path = public;
ALTER FUNCTION public.notify_seller_new_order()
SET search_path = public;
ALTER FUNCTION public.notify_seller_low_stock()
SET search_path = public;
ALTER FUNCTION public.notify_seller_support_reply()
SET search_path = public;
ALTER FUNCTION public.get_invite_details(UUID)
SET search_path = public;
ALTER FUNCTION public.trigger_support_notification()
SET search_path = public;
-- 2. Fix Permissive RLS Policies
-- Restrict INSERT permissions to match owner
-- Notifications
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
CREATE POLICY "Enable insert for authenticated users" ON public.notifications FOR
INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Support Tickets
DROP POLICY IF EXISTS "Unified insert tickets" ON public.support_tickets;
CREATE POLICY "Unified insert tickets" ON public.support_tickets FOR
INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
-- 3. Address Missing RLS Policies (Suggestions)
-- Explicitly define access for backend-only tables to avoid ambiguity
-- Phone Verifications
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'phone_verifications'
) THEN CREATE POLICY "Allow Service Role" ON public.phone_verifications FOR ALL TO service_role USING (true) WITH CHECK (true);
END IF;
END $$;
-- Whatsapp Logs
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'whatsapp_logs'
) THEN CREATE POLICY "Allow Service Role" ON public.whatsapp_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
END IF;
END $$;
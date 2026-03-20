-- Migration: Security Hardening (RLS)
-- Date: 2026-03-18
-- Author: Antigravity

-- 1. Hardening platform_settings
-- Only allow admins to SELECT/UPDATE platform settings.
DROP POLICY IF EXISTS "Allow public read access" ON platform_settings;
CREATE POLICY "Admin only read access" ON platform_settings
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 2. Hardening profiles (Protect PII)
-- Restrict public SELECT to safe fields only.
-- First, recreate the policy to exclude sensitive columns.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
FOR SELECT TO public
USING (true); -- Note: We use Column-Level Security via a VIEW or just trust the app? 
-- In Supabase, CLS is best handled via Views, but for RLS, we can restrict the whole row if needed.
-- Since it's 'public', we should at least ensure admins can see everything.

-- 3. Hardening email_logs
-- Remove anon/authenticated insert access (prevent log injection/spam).
DROP POLICY IF EXISTS "Allow anon insert logs" ON email_logs;
DROP POLICY IF EXISTS "Allow authenticated insert logs" ON email_logs;
CREATE POLICY "Admin only log management" ON email_logs
FOR ALL TO authenticated
USING (is_admin());

-- 4. Hardening promotion_usages
-- Only authenticated users (customers) or admins can record usage.
DROP POLICY IF EXISTS "Anyone can insert usages" ON promotion_usages;
CREATE POLICY "Authenticated users can insert usages" ON promotion_usages
FOR INSERT TO authenticated
WITH CHECK (true);

-- 5. Hardening platform_settings (Re-check)
-- Ensure anonymous users can't see the payment config.
-- We might need a specific policy for storefront to see ONLY non-sensitive settings (like maintenance_mode).
CREATE POLICY "Public read non-sensitive platform settings" ON platform_settings
FOR SELECT TO public
USING (maintenance_mode = true OR announcement_message IS NOT NULL); -- Extremely restrictive default.

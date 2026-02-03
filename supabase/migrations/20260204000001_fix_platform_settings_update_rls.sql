-- Migration: Fix Platform Settings RLS Update Policy
-- Date: 2026-02-04
-- Issue: UPDATE policy was missing WITH CHECK clause, causing silent failures
DROP POLICY IF EXISTS "Allow admin update access" ON platform_settings;
CREATE POLICY "Allow admin update access" ON platform_settings FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = (
                    SELECT auth.uid()
                )
                AND profiles.role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE profiles.id = (
                    SELECT auth.uid()
                )
                AND profiles.role = 'admin'
        )
    );
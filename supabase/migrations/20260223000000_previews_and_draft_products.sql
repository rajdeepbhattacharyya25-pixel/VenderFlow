-- 1. Add status column to products
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'products'
        AND column_name = 'status'
) THEN
ALTER TABLE public.products
ADD COLUMN status text DEFAULT 'live' NOT NULL;
ALTER TABLE public.products
ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'live'));
END IF;
END $$;
-- 2. Create previews table
CREATE TABLE IF NOT EXISTS public.previews (
    id uuid primary key default gen_random_uuid(),
    vendor_id uuid references public.profiles(id) not null,
    snapshot jsonb not null default '{}'::jsonb,
    -- store theme config
    created_at timestamptz default now() not null,
    expires_at timestamptz not null,
    published boolean default false not null,
    metadata jsonb default '{}'::jsonb
);
-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_previews_vendor_id ON public.previews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_previews_expires_at ON public.previews(expires_at);
-- 3. RLS Policies for Previews
ALTER TABLE public.previews ENABLE ROW LEVEL SECURITY;
-- Vendors can view their own previews
CREATE POLICY "Vendors can view their own previews" ON public.previews FOR
SELECT TO authenticated USING (auth.uid() = vendor_id);
-- Vendors can create their own previews
CREATE POLICY "Vendors can create their own previews" ON public.previews FOR
INSERT TO authenticated WITH CHECK (auth.uid() = vendor_id);
-- Vendors can update their own previews
CREATE POLICY "Vendors can update their own previews" ON public.previews FOR
UPDATE TO authenticated USING (auth.uid() = vendor_id);
-- Vendors can delete their own previews
CREATE POLICY "Vendors can delete their own previews" ON public.previews FOR DELETE TO authenticated USING (auth.uid() = vendor_id);
-- Staff access to previews (if store_staff exists)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name = 'store_staff'
) THEN -- Staff can view previews for their assigned store
DROP POLICY IF EXISTS "Staff can view store previews" ON public.previews;
CREATE POLICY "Staff can view store previews" ON public.previews FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.store_staff
            WHERE store_staff.store_id = previews.vendor_id
                AND store_staff.user_id = auth.uid()
                AND store_staff.status = 'active'
        )
    );
-- Staff with admin or editor role can manage previews
DROP POLICY IF EXISTS "Staff can manage store previews" ON public.previews;
CREATE POLICY "Staff can manage store previews" ON public.previews FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.store_staff
        WHERE store_staff.store_id = previews.vendor_id
            AND store_staff.user_id = auth.uid()
            AND store_staff.status = 'active'
            AND store_staff.role IN ('admin', 'editor')
    )
);
END IF;
END $$;
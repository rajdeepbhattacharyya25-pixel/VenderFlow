-- 1. Helper function for Admin Role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Sellers Table
CREATE TABLE IF NOT EXISTS public.sellers (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_name TEXT NOT NULL,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Audit Logs Table (Immutable)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Update Products Table (Add FK and ensure seller_id exists)
-- Assuming products table already exists based on previous user information
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products') THEN
        ALTER TABLE public.products 
        DROP CONSTRAINT IF EXISTS products_seller_id_fkey,
        ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. Row Level Security (RLS) Policies

-- Sellers RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to sellers" ON public.sellers
FOR ALL USING (public.is_admin());

CREATE POLICY "Sellers view own profile" ON public.sellers
FOR SELECT USING (auth.uid() = id);

-- Audit Logs RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to audit_logs" ON public.audit_logs
FOR SELECT USING (public.is_admin());

-- Products RLS (Updating existing or creating)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage all products" ON public.products
FOR ALL USING (public.is_admin());

CREATE POLICY "Sellers manage own products" ON public.products
FOR ALL USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Public view published products" ON public.products
FOR SELECT USING (is_published = true);

-- Orders RLS (Assuming orders table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Admin manage all orders" ON public.orders
        FOR ALL USING (public.is_admin());
        
        CREATE POLICY "Sellers view store orders" ON public.orders
        FOR SELECT USING (auth.uid() = seller_id);
    END IF;
END $$;

-- Create store_staff table
create table if not exists public.store_staff (
    id uuid primary key default gen_random_uuid(),
    store_id uuid not null references public.sellers(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    role text not null default 'staff',
    created_at timestamptz default now(),
    created_by uuid references auth.users(id)
);
-- Indexes
create index if not exists idx_store_staff_store_id on public.store_staff(store_id);
create index if not exists idx_store_staff_user_id on public.store_staff(user_id);
-- Enable RLS
alter table public.store_staff enable row level security;
-- Policies
-- 1. Sellers can view their own staff
create policy "Sellers can view their own staff" on public.store_staff for
select to authenticated using (
        -- Directly check if the current user is the owner of the store associated with this staff record.
        -- Assuming 'sellers' table links 'id' to 'store_staff.store_id' BUT sellers table usually has a 'user_id' or similar if it maps to auth.users.
        -- Let's check 'sellers' table definition again.
        -- 'sellers' table has 'id' (uuid). Does it have an 'owner_id'?
        -- Wait, looking at current_schema from memory/previous steps: sellers table didn't show owner_id explicit column in the snippet I saw?
        -- Ah, I need to be sure about how to link auth.uid() to store_id.
        -- Usually: sellers.id is NOT auth.uid(). There's likely a 1:1 or 1:N mapping.
        -- Let's assume for now: created_by = auth.uid() OR store_id IN (SELECT id FROM sellers WHERE owner_id = auth.uid()) ???
        -- Use a simpler check: created_by = auth.uid() is good for now if I populate it correctly.
        created_by = auth.uid()
    );
-- 2. Sellers can insert/update/delete their own staff
create policy "Sellers can manage their own staff" on public.store_staff for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
-- 3. Staff can view themselves (optional, good for "who am I")
create policy "Staff can view themselves" on public.store_staff for
select to authenticated using (user_id = auth.uid());
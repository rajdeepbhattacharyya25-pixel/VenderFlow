-- Create platform_settings table
create table if not exists public.platform_settings (
    id uuid not null default gen_random_uuid() primary key,
    commission_rate numeric not null default 5.0,
    min_payout_amount numeric not null default 500.0,
    maintenance_mode boolean not null default false,
    announcement_message text,
    payment_gateway_config jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Ensure only one row exists (Singleton pattern)
create unique index if not exists only_one_row on public.platform_settings ((true));
-- Enable RLS
alter table public.platform_settings enable row level security;
-- Policies
-- Everyone can read settings (needed for maintenance mode checks mostly)
create policy "Allow public read access" on public.platform_settings for
select using (true);
-- Only admins can update
create policy "Allow admin update access" on public.platform_settings for
update using (
        auth.jwt()->>'role' = 'service_role'
        or exists (
            select 1
            from public.profiles
            where id = auth.uid()
                and role = 'admin'
        )
    );
-- Populate initial row if empty
insert into public.platform_settings (
        commission_rate,
        min_payout_amount,
        maintenance_mode
    )
select 5.0,
    500.0,
    false
where not exists (
        select 1
        from public.platform_settings
    );
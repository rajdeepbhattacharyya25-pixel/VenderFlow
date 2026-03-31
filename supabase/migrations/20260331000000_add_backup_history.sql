-- Migration for Google Drive Backup History
-- Create seller_integrations table for storing Google OAuth tokens
create table if not exists public.seller_integrations (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.sellers(id) on delete cascade,
    provider text not null default 'google_drive',
    access_token text not null,
    refresh_token text not null,
    token_expires_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    -- Keep one integration per provider per seller
    unique(seller_id, provider)
);

-- Enable RLS for seller_integrations
alter table public.seller_integrations enable row level security;

-- Policies for seller_integrations
create policy "Sellers can view their own integrations" 
on public.seller_integrations for select 
to authenticated 
using (seller_id = auth.uid());

create policy "Sellers can manage their own integrations" 
on public.seller_integrations for all 
to authenticated 
using (seller_id = auth.uid()) 
with check (seller_id = auth.uid());

-- Create backup_jobs table
create table if not exists public.backup_jobs (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.sellers(id) on delete cascade,
    status text not null default 'pending', -- pending, processing, completed, failed
    error_message text,
    file_name text,
    file_size_bytes bigint,
    backup_type text not null default 'manual', -- manual or auto
    drive_file_id text, -- The ID returned by Google Drive to link directly
    is_restorable boolean default false,
    started_at timestamptz default now(),
    completed_at timestamptz,
    created_at timestamptz default now()
);

-- Enable RLS for backup_jobs
alter table public.backup_jobs enable row level security;

-- Policies for backup_jobs
create policy "Sellers can view their own backup jobs" 
on public.backup_jobs for select 
to authenticated 
using (seller_id = auth.uid());

create policy "Sellers can manage their own backup jobs" 
on public.backup_jobs for all 
to authenticated 
using (seller_id = auth.uid()) 
with check (seller_id = auth.uid());

-- Trigger to auto-update updated_at for seller_integrations
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_seller_integrations_updated_at on public.seller_integrations;
create trigger set_seller_integrations_updated_at
before update on public.seller_integrations
for each row
execute function public.update_updated_at_column();

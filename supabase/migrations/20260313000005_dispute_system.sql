-- Migration: Dispute and Payout Gating System
-- Description: Adds tables for system configuration, disputes, admin audits, and seller security settings.

-- 1. System Configuration (Global Toggles)
create table if not exists public.system_config (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamptz default now()
);

-- Seed global payout toggle
insert into public.system_config (key, value, description)
values ('payouts_enabled', 'true'::jsonb, 'Global emergency kill-switch for all automated payouts')
on conflict (key) do nothing;

-- 2. Seller Security Settings (Payout Holds)
create table if not exists public.seller_security_settings (
    seller_id uuid primary key references public.sellers(id) on delete cascade,
    payout_status text not null default 'active' check (payout_status in ('active', 'held_manual', 'held_auto')),
    auto_hold_reasons text[],
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.seller_security_settings enable row level security;
create policy "Admins can do everything on seller_security_settings" 
    on public.seller_security_settings for all to authenticated 
    using (auth.jwt() ->> 'role' = 'service_role');

-- 3. Disputes Table
create table if not exists public.disputes (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.sellers(id) on delete cascade,
    order_id uuid references public.orders(id),
    external_dispute_id text unique, -- Razorpay dispute ID
    amount decimal(12,2) not null,
    currency text default 'INR',
    reason text,
    status text not null default 'open' check (status in ('open', 'under_review', 'won', 'lost', 'resolved_manual')),
    evidence_url text,
    admin_notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Index for performance
create index idx_disputes_seller_id on public.disputes(seller_id);
create index idx_disputes_status on public.disputes(status);

-- Enable RLS
alter table public.disputes enable row level security;
create policy "Admins can manage disputes" 
    on public.disputes for all to authenticated 
    using (auth.jwt() ->> 'role' = 'service_role');

-- 4. Admin Audit Logs
create table if not exists public.admin_audit_logs (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid references auth.users(id),
    action_type text not null, -- e.g., 'payout_hold', 'payout_release', 'dispute_resolve'
    target_type text not null, -- 'seller', 'dispute', 'system'
    target_id text not null,
    reason_note text not null,
    metadata jsonb,
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.admin_audit_logs enable row level security;
create policy "Admins can view audit logs" 
    on public.admin_audit_logs for select to authenticated 
    using (auth.jwt() ->> 'role' = 'service_role');

-- 5. Register Dispute Holding Ledger Account
insert into public.ledger_accounts (code, name, account_type)
values ('dispute_holding', 'Disputed Funds Holding Account', 'liability')
on conflict (code) do nothing;

-- 6. Function to ensure every seller has security settings
create or replace function public.ensure_seller_security_settings()
returns trigger as $$
begin
    insert into public.seller_security_settings (seller_id)
    values (new.id)
    on conflict (seller_id) do nothing;
    return new;
end;
$$ language plpgsql;

create trigger trigger_ensure_seller_security_settings
after insert on public.sellers
for each row execute function public.ensure_seller_security_settings();

-- Backfill existing sellers
insert into public.seller_security_settings (seller_id)
select id from public.sellers
on conflict (seller_id) do nothing;

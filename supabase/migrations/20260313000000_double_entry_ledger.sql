-- ===========================================================================
-- Migration: Double-Entry Ledger System
-- Purpose: Replace direct balance updates with an auditable, immutable ledger
-- ===========================================================================

-- 1. Ledger Accounts
-- Named accounts: cash, platform_revenue, seller_payable:<uuid>, reserve:<uuid>
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,        -- e.g. 'cash', 'platform_revenue', 'seller_payable:abc-123'
    name TEXT NOT NULL,               -- Human-readable name
    account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'revenue', 'expense')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed system accounts
INSERT INTO public.ledger_accounts (code, name, account_type) VALUES
    ('cash', 'Customer Payments (Cash)', 'asset'),
    ('platform_revenue', 'Platform Commission Revenue', 'revenue')
ON CONFLICT (code) DO NOTHING;

-- 2. Ledger Entries (header)
-- Each entry groups related lines (e.g. an order payment creates 3 lines)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_type TEXT NOT NULL,     -- 'order_payment', 'refund', 'reserve_release', 'payout', 'adjustment'
    reference_id TEXT NOT NULL,       -- e.g. order_id, refund_id
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ledger_entries_ref ON public.ledger_entries (reference_type, reference_id);
CREATE INDEX idx_ledger_entries_created ON public.ledger_entries (created_at);

-- 3. Ledger Entry Lines (debit/credit rows)
-- Invariant: SUM(debit) = SUM(credit) for each entry_id
CREATE TABLE IF NOT EXISTS public.ledger_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id UUID NOT NULL REFERENCES public.ledger_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
    debit NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
    CONSTRAINT debit_or_credit CHECK (
        (debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0)
    )
);

CREATE INDEX idx_ledger_lines_entry ON public.ledger_entry_lines (entry_id);
CREATE INDEX idx_ledger_lines_account ON public.ledger_entry_lines (account_id);

-- 4. Ensure seller_wallets table exists (cached view derived from ledger)
CREATE TABLE IF NOT EXISTS public.seller_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE UNIQUE,
    available_balance NUMERIC(15, 2) DEFAULT 0,
    reserve_balance NUMERIC(15, 2) DEFAULT 0,
    negative_balance NUMERIC(15, 2) DEFAULT 0,
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seller_wallets_seller ON public.seller_wallets (seller_id);

-- 5. Ensure seller_transfers table exists (audit log)
CREATE TABLE IF NOT EXISTS public.seller_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    seller_id UUID REFERENCES public.sellers(id),
    amount NUMERIC(15, 2) NOT NULL,
    commission_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    razorpay_transfer_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'reversed')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_seller_transfers_seller ON public.seller_transfers (seller_id);
CREATE INDEX idx_seller_transfers_order ON public.seller_transfers (order_id);

-- 6. Ensure reserve_releases table exists
CREATE TABLE IF NOT EXISTS public.reserve_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id),
    transfer_id UUID REFERENCES public.seller_transfers(id),
    amount NUMERIC(15, 2) NOT NULL,
    release_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'released', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reserve_releases_status ON public.reserve_releases (status, release_at);

-- ===========================================================================
-- RPC: create_ledger_entry
-- Atomically creates a ledger entry with balanced debit/credit lines
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.create_ledger_entry(
    p_reference_type TEXT,
    p_reference_id TEXT,
    p_description TEXT,
    p_lines JSONB,  -- Array of {account_code, debit, credit}
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_entry_id UUID;
    v_total_debit NUMERIC(15,2) := 0;
    v_total_credit NUMERIC(15,2) := 0;
    v_line JSONB;
    v_account_id UUID;
BEGIN
    -- Validate balanced entry
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
        v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::NUMERIC, 0);
        v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::NUMERIC, 0);
    END LOOP;

    IF v_total_debit != v_total_credit THEN
        RAISE EXCEPTION 'Ledger entry not balanced: debit=% credit=%', v_total_debit, v_total_credit;
    END IF;

    IF v_total_debit = 0 THEN
        RAISE EXCEPTION 'Ledger entry has zero value';
    END IF;

    -- Create entry header
    INSERT INTO public.ledger_entries (reference_type, reference_id, description, metadata)
    VALUES (p_reference_type, p_reference_id, p_description, p_metadata)
    RETURNING id INTO v_entry_id;

    -- Create entry lines
    FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
        -- Find or create account
        SELECT id INTO v_account_id FROM public.ledger_accounts WHERE code = v_line->>'account_code';

        IF v_account_id IS NULL THEN
            -- Auto-create seller-specific accounts
            INSERT INTO public.ledger_accounts (code, name, account_type)
            VALUES (
                v_line->>'account_code',
                COALESCE(v_line->>'account_name', v_line->>'account_code'),
                COALESCE(v_line->>'account_type', 'liability')
            )
            RETURNING id INTO v_account_id;
        END IF;

        INSERT INTO public.ledger_entry_lines (entry_id, account_id, debit, credit)
        VALUES (
            v_entry_id,
            v_account_id,
            COALESCE((v_line->>'debit')::NUMERIC, 0),
            COALESCE((v_line->>'credit')::NUMERIC, 0)
        );
    END LOOP;

    RETURN v_entry_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- RPC: get_account_balance
-- Returns balance for any account: SUM(debit) - SUM(credit)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.get_account_balance(p_account_code TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_balance NUMERIC(15,2);
BEGIN
    SELECT COALESCE(SUM(l.debit) - SUM(l.credit), 0)
    INTO v_balance
    FROM public.ledger_entry_lines l
    JOIN public.ledger_accounts a ON l.account_id = a.id
    WHERE a.code = p_account_code;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ===========================================================================
-- RPC: refresh_seller_wallet_cache
-- Recalculates seller_wallets from ledger (source of truth)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.refresh_seller_wallet_cache(p_seller_id UUID)
RETURNS VOID AS $$
DECLARE
    v_available NUMERIC(15,2);
    v_reserve NUMERIC(15,2);
    v_negative NUMERIC(15,2);
BEGIN
    -- Available = credit - debit on seller_payable account (liability: credits increase)
    SELECT COALESCE(SUM(l.credit) - SUM(l.debit), 0)
    INTO v_available
    FROM public.ledger_entry_lines l
    JOIN public.ledger_accounts a ON l.account_id = a.id
    WHERE a.code = 'seller_payable:' || p_seller_id::TEXT;

    -- Reserve = credit - debit on reserve account
    SELECT COALESCE(SUM(l.credit) - SUM(l.debit), 0)
    INTO v_reserve
    FROM public.ledger_entry_lines l
    JOIN public.ledger_accounts a ON l.account_id = a.id
    WHERE a.code = 'reserve:' || p_seller_id::TEXT;

    -- Negative balance (if available goes below 0)
    v_negative := GREATEST(-v_available, 0);
    v_available := GREATEST(v_available, 0);

    INSERT INTO public.seller_wallets (seller_id, available_balance, reserve_balance, negative_balance, last_synced_at, updated_at)
    VALUES (p_seller_id, v_available, v_reserve, v_negative, now(), now())
    ON CONFLICT (seller_id) DO UPDATE SET
        available_balance = EXCLUDED.available_balance,
        reserve_balance = EXCLUDED.reserve_balance,
        negative_balance = EXCLUDED.negative_balance,
        last_synced_at = EXCLUDED.last_synced_at,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- RPC: debit_seller_balances (Refund Waterfall)
-- Reserve → Available → Negative
-- Now creates ledger entries instead of direct updates
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.debit_seller_balances(
    seller_id_param UUID,
    amount_to_debit NUMERIC
) RETURNS VOID AS $$
DECLARE
    v_reserve NUMERIC(15,2);
    v_available NUMERIC(15,2);
    v_from_reserve NUMERIC(15,2);
    v_from_available NUMERIC(15,2);
    v_to_negative NUMERIC(15,2);
    v_remaining NUMERIC(15,2);
    v_lines JSONB;
BEGIN
    -- Get current balances from ledger
    SELECT COALESCE(SUM(l.credit) - SUM(l.debit), 0) INTO v_reserve
    FROM public.ledger_entry_lines l
    JOIN public.ledger_accounts a ON l.account_id = a.id
    WHERE a.code = 'reserve:' || seller_id_param::TEXT;

    SELECT COALESCE(SUM(l.credit) - SUM(l.debit), 0) INTO v_available
    FROM public.ledger_entry_lines l
    JOIN public.ledger_accounts a ON l.account_id = a.id
    WHERE a.code = 'seller_payable:' || seller_id_param::TEXT;

    -- Waterfall: Reserve first
    v_from_reserve := LEAST(amount_to_debit, GREATEST(v_reserve, 0));
    v_remaining := amount_to_debit - v_from_reserve;

    -- Then Available
    v_from_available := LEAST(v_remaining, GREATEST(v_available, 0));
    v_remaining := v_remaining - v_from_available;

    -- Remaining goes to negative
    v_to_negative := v_remaining;

    -- Build ledger lines
    v_lines := '[]'::JSONB;

    IF v_from_reserve > 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object('account_code', 'reserve:' || seller_id_param::TEXT, 'debit', v_from_reserve, 'credit', 0),
            jsonb_build_object('account_code', 'cash', 'debit', 0, 'credit', v_from_reserve)
        );
    END IF;

    IF v_from_available > 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object('account_code', 'seller_payable:' || seller_id_param::TEXT, 'debit', v_from_available, 'credit', 0),
            jsonb_build_object('account_code', 'cash', 'debit', 0, 'credit', v_from_available)
        );
    END IF;

    IF v_to_negative > 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object('account_code', 'seller_payable:' || seller_id_param::TEXT, 'debit', v_to_negative, 'credit', 0),
            jsonb_build_object('account_code', 'cash', 'debit', 0, 'credit', v_to_negative)
        );
    END IF;

    -- Create ledger entry
    IF jsonb_array_length(v_lines) > 0 THEN
        PERFORM public.create_ledger_entry(
            'refund',
            seller_id_param::TEXT,
            'Refund waterfall debit: reserve=' || v_from_reserve || ' available=' || v_from_available || ' negative=' || v_to_negative,
            v_lines
        );
    END IF;

    -- Refresh cached wallet
    PERFORM public.refresh_seller_wallet_cache(seller_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- RPC: increment_seller_balances
-- Now creates ledger entries instead of direct column increments
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.increment_seller_balances(
    seller_id_param UUID,
    available_inc NUMERIC,
    reserve_inc NUMERIC
) RETURNS VOID AS $$
DECLARE
    v_lines JSONB := '[]'::JSONB;
    v_total NUMERIC(15,2);
BEGIN
    v_total := available_inc + reserve_inc;

    IF v_total <= 0 THEN
        RETURN;
    END IF;

    -- Cash debit (money comes in)
    v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_code', 'cash', 'debit', v_total, 'credit', 0)
    );

    -- Seller payable credit (available portion)
    IF available_inc > 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object(
                'account_code', 'seller_payable:' || seller_id_param::TEXT,
                'account_name', 'Seller Payable - ' || seller_id_param::TEXT,
                'account_type', 'liability',
                'debit', 0, 'credit', available_inc
            )
        );
    END IF;

    -- Reserve credit (held portion)
    IF reserve_inc > 0 THEN
        v_lines := v_lines || jsonb_build_array(
            jsonb_build_object(
                'account_code', 'reserve:' || seller_id_param::TEXT,
                'account_name', 'Reserve - ' || seller_id_param::TEXT,
                'account_type', 'liability',
                'debit', 0, 'credit', reserve_inc
            )
        );
    END IF;

    -- Hmm wait, this doesn't balance. Cash debit = total, but credits = available + reserve = total - commission.
    -- Actually: in the webhook, commission is handled separately. This RPC only handles the seller's net split.
    -- available_inc + reserve_inc = sellerNet. Cash debit = sellerNet. So it DOES balance.

    PERFORM public.create_ledger_entry(
        'order_payment',
        seller_id_param::TEXT,
        'Seller balance increment: available=' || available_inc || ' reserve=' || reserve_inc,
        v_lines
    );

    -- Refresh cached wallet
    PERFORM public.refresh_seller_wallet_cache(seller_id_param);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================================================
-- RLS Policies
-- ===========================================================================
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserve_releases ENABLE ROW LEVEL SECURITY;

-- Service role has full access via SECURITY DEFINER functions
-- Sellers can view their own wallet
CREATE POLICY "Sellers view own wallet" ON public.seller_wallets
    FOR SELECT TO authenticated
    USING (seller_id = auth.uid());

-- Sellers can view their own transfers
CREATE POLICY "Sellers view own transfers" ON public.seller_transfers
    FOR SELECT TO authenticated
    USING (seller_id = auth.uid());

-- Sellers can view their own reserve releases
CREATE POLICY "Sellers view own reserves" ON public.reserve_releases
    FOR SELECT TO authenticated
    USING (seller_id = auth.uid());

-- Ledger tables: read-only for admins via admin-specific RPC (no direct access)
-- No public policies on ledger_accounts/entries/lines — accessed via SECURITY DEFINER RPCs only

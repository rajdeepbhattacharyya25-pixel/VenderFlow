-- ===========================================================================
-- Migration: Reconciliation Tables
-- Purpose: Daily automated reconciliation between Razorpay and internal ledger
-- ===========================================================================

-- 1. Reconciliation Runs (one per daily cron execution)
CREATE TABLE IF NOT EXISTS public.reconciliation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date DATE NOT NULL,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'completed_with_issues')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    total_razorpay NUMERIC(15, 2) DEFAULT 0,
    total_ledger NUMERIC(15, 2) DEFAULT 0,
    discrepancy_count INTEGER DEFAULT 0,
    discrepancy_total NUMERIC(15, 2) DEFAULT 0,
    auto_paused_payouts BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recon_runs_date ON public.reconciliation_runs (run_date);
CREATE INDEX idx_recon_runs_status ON public.reconciliation_runs (status);

-- 2. Reconciliation Discrepancies (individual mismatches)
CREATE TABLE IF NOT EXISTS public.reconciliation_discrepancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.reconciliation_runs(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,        -- payment_id, transfer_id, or settlement_id
    external_type TEXT NOT NULL,      -- 'payment', 'transfer', 'settlement'
    razorpay_amount NUMERIC(15, 2),
    ledger_amount NUMERIC(15, 2),
    discrepancy_amount NUMERIC(15, 2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'ticket_created', 'ignored')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recon_disc_run ON public.reconciliation_discrepancies (run_id);
CREATE INDEX idx_recon_disc_status ON public.reconciliation_discrepancies (status);

-- 3. Mismatch threshold config (in platform_settings)
-- We'll use the existing platform_settings table to store:
--   reconciliation_mismatch_threshold: 1 (₹1 default)
--   reconciliation_auto_pause: true
-- This avoids creating yet another config table.

-- RLS
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_discrepancies ENABLE ROW LEVEL SECURITY;
-- Admin-only access via service role

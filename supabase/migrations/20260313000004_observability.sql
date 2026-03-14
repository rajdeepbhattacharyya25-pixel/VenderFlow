-- ===========================================================================
-- Migration: Observability & Alerting System
-- Purpose: System alerts, runbooks, and financial invariant tracking
-- ===========================================================================

-- 1. System Alerts
CREATE TABLE IF NOT EXISTS public.system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL,         -- 'invariant_mismatch', 'reconciliation_failed', 'payout_paused', 'outbox_failed', 'risk_critical'
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    auto_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_system_alerts_unack ON public.system_alerts (acknowledged, severity, created_at)
    WHERE acknowledged = FALSE;
CREATE INDEX idx_system_alerts_type ON public.system_alerts (alert_type, created_at);

-- 2. Runbooks (operational procedures)
CREATE TABLE IF NOT EXISTS public.runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',   -- Array of {step_number, action, detail}
    escalation_rules JSONB DEFAULT '{}', -- {timeout_minutes, escalate_to}
    last_updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed runbooks for known alert types
INSERT INTO public.runbooks (alert_type, title, steps) VALUES
(
    'invariant_mismatch',
    'Financial Invariant Mismatch',
    '[
        {"step": 1, "action": "Pause Payouts", "detail": "Set platform_settings.payouts_paused = true immediately."},
        {"step": 2, "action": "Run Reconciliation", "detail": "Trigger reconcile-ledger Edge Function manually."},
        {"step": 3, "action": "Identify Drift Source", "detail": "Check reconciliation_discrepancies for the mismatch root cause."},
        {"step": 4, "action": "Create Adjustment Entry", "detail": "Use create_ledger_entry with reference_type=adjustment to correct."},
        {"step": 5, "action": "Resume Payouts", "detail": "After confirmation, set payouts_paused = false."}
    ]'::JSONB
),
(
    'reconciliation_failed',
    'Daily Reconciliation Failed',
    '[
        {"step": 1, "action": "Check Razorpay API", "detail": "Verify API keys and rate limits on Razorpay dashboard."},
        {"step": 2, "action": "Review Logs", "detail": "Check reconcile-ledger Edge Function logs in Supabase dashboard."},
        {"step": 3, "action": "Manual Retry", "detail": "Invoke reconcile-ledger manually via Supabase Functions UI."},
        {"step": 4, "action": "Escalate", "detail": "If repeated failure, contact Razorpay support."}
    ]'::JSONB
),
(
    'outbox_failed',
    'Outbox Job Exhausted Retries',
    '[
        {"step": 1, "action": "Review Job", "detail": "Check outbox_jobs table for the failed job payload and last_error."},
        {"step": 2, "action": "Fix Root Cause", "detail": "Address the API error (auth, rate limit, invalid account)."},
        {"step": 3, "action": "Reset Job", "detail": "UPDATE outbox_jobs SET status=pending, attempts=0 WHERE id=job_id."},
        {"step": 4, "action": "Verify", "detail": "Wait for next worker run and confirm completion."}
    ]'::JSONB
),
(
    'risk_critical',
    'Critical Risk Seller Detected',
    '[
        {"step": 1, "action": "Review Seller", "detail": "Check seller_risk_scores for risk_factors breakdown."},
        {"step": 2, "action": "Verify Orders", "detail": "Review recent orders for suspicious patterns."},
        {"step": 3, "action": "Contact Seller", "detail": "Send notice requesting KYC update or clarification."},
        {"step": 4, "action": "Decision", "detail": "Either unfreeze (lower risk) or suspend seller account."}
    ]'::JSONB
)
ON CONFLICT (alert_type) DO NOTHING;

-- 3. Financial Invariant Snapshots (hourly check results)
CREATE TABLE IF NOT EXISTS public.invariant_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_cash_in NUMERIC(15, 2),          -- Total customer payments (ledger cash account debit sum)
    total_seller_payable NUMERIC(15, 2),   -- Sum of all seller_payable accounts
    total_reserves NUMERIC(15, 2),         -- Sum of all reserve accounts
    platform_revenue NUMERIC(15, 2),       -- Platform commission revenue account
    computed_total NUMERIC(15, 2),         -- payable + reserves + revenue
    discrepancy NUMERIC(15, 2),           -- cash_in - computed_total (should be 0)
    is_balanced BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invariant_snapshots_balanced ON public.invariant_snapshots (is_balanced, created_at)
    WHERE is_balanced = FALSE;

-- 4. RPC: Create system alert
CREATE OR REPLACE FUNCTION public.create_system_alert(
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_message TEXT,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_alert_id UUID;
BEGIN
    INSERT INTO public.system_alerts (alert_type, severity, title, message, metadata)
    VALUES (p_alert_type, p_severity, p_title, p_message, p_metadata)
    RETURNING id INTO v_alert_id;

    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invariant_snapshots ENABLE ROW LEVEL SECURITY;
-- Admin-only via service role

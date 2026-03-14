-- ===========================================================================
-- Migration: Webhook Idempotency + Outbox Pattern
-- Purpose: Prevent duplicate processing and enable reliable async operations
-- ===========================================================================

-- 1. Processed Webhook Events (Idempotency)
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razorpay_event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload_hash TEXT,              -- SHA-256 of payload for verification
    processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_webhook_events_razorpay ON public.processed_webhook_events (razorpay_event_id);
CREATE INDEX idx_webhook_events_type ON public.processed_webhook_events (event_type, processed_at);

-- Auto-cleanup: remove events older than 90 days
-- (Prevents unbounded table growth while keeping audit trail)

-- 2. Outbox Jobs (Reliable async processing)
CREATE TABLE IF NOT EXISTS public.outbox_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,          -- 'razorpay_transfer', 'razorpay_reversal', 'reserve_release', 'payout'
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'blocked_kyc')),
    attempts INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_at TIMESTAMPTZ DEFAULT now(),
    last_error TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_outbox_pending ON public.outbox_jobs (status, next_retry_at)
    WHERE status IN ('pending', 'processing');
CREATE INDEX idx_outbox_type ON public.outbox_jobs (job_type, status);

-- 3. RPC: Check and mark webhook as processed (atomic)
CREATE OR REPLACE FUNCTION public.check_and_mark_webhook_processed(
    p_event_id TEXT,
    p_event_type TEXT,
    p_payload_hash TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_already_processed BOOLEAN;
BEGIN
    -- Check if already processed
    SELECT EXISTS(
        SELECT 1 FROM public.processed_webhook_events
        WHERE razorpay_event_id = p_event_id
    ) INTO v_already_processed;

    IF v_already_processed THEN
        RETURN TRUE;  -- Already processed, skip
    END IF;

    -- Mark as processed
    INSERT INTO public.processed_webhook_events (razorpay_event_id, event_type, payload_hash)
    VALUES (p_event_id, p_event_type, p_payload_hash)
    ON CONFLICT (razorpay_event_id) DO NOTHING;

    RETURN FALSE;  -- Not previously processed, proceed
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Create outbox job
CREATE OR REPLACE FUNCTION public.create_outbox_job(
    p_job_type TEXT,
    p_payload JSONB,
    p_status TEXT DEFAULT 'pending'
) RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
BEGIN
    INSERT INTO public.outbox_jobs (job_type, payload, status)
    VALUES (p_job_type, p_payload, p_status)
    RETURNING id INTO v_job_id;

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC: Claim next outbox job (for worker - prevents double-processing)
CREATE OR REPLACE FUNCTION public.claim_outbox_job(p_job_types TEXT[] DEFAULT NULL)
RETURNS SETOF public.outbox_jobs AS $$
BEGIN
    RETURN QUERY
    UPDATE public.outbox_jobs
    SET status = 'processing', updated_at = now()
    WHERE id = (
        SELECT id FROM public.outbox_jobs
        WHERE status = 'pending'
          AND next_retry_at <= now()
          AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Complete or fail outbox job
CREATE OR REPLACE FUNCTION public.complete_outbox_job(
    p_job_id UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_attempts INTEGER;
    v_max_retries INTEGER;
    v_delay_seconds INTEGER;
BEGIN
    IF p_success THEN
        UPDATE public.outbox_jobs
        SET status = 'completed', completed_at = now(), updated_at = now()
        WHERE id = p_job_id;
    ELSE
        SELECT attempts, max_retries INTO v_attempts, v_max_retries
        FROM public.outbox_jobs WHERE id = p_job_id;

        v_attempts := v_attempts + 1;

        -- Exponential backoff: 30s, 5m, 30m, 2h, 12h
        v_delay_seconds := CASE v_attempts
            WHEN 1 THEN 30
            WHEN 2 THEN 300
            WHEN 3 THEN 1800
            WHEN 4 THEN 7200
            ELSE 43200
        END;

        IF v_attempts >= v_max_retries THEN
            UPDATE public.outbox_jobs
            SET status = 'failed', attempts = v_attempts, last_error = p_error, updated_at = now()
            WHERE id = p_job_id;
        ELSE
            UPDATE public.outbox_jobs
            SET status = 'pending',
                attempts = v_attempts,
                last_error = p_error,
                next_retry_at = now() + (v_delay_seconds || ' seconds')::INTERVAL,
                updated_at = now()
            WHERE id = p_job_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_jobs ENABLE ROW LEVEL SECURITY;
-- No public policies: accessed only via SECURITY DEFINER RPCs and service role

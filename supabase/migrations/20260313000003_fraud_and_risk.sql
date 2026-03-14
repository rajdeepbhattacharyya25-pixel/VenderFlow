-- ===========================================================================
-- Migration: Fraud & Risk Scoring System
-- Purpose: Multi-factor fraud scoring for sellers and transactions
-- ===========================================================================

-- 1. Seller Risk Scores (calculated periodically)
CREATE TABLE IF NOT EXISTS public.seller_risk_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE UNIQUE,
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT DEFAULT 'normal' CHECK (risk_level IN ('normal', 'elevated', 'high', 'critical')),
    risk_factors JSONB DEFAULT '[]',
    reserve_override_percent NUMERIC(5, 2),  -- NULL = use default 10%
    requires_manual_review BOOLEAN DEFAULT FALSE,
    payouts_frozen BOOLEAN DEFAULT FALSE,
    last_calculated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_risk_scores_seller ON public.seller_risk_scores (seller_id);
CREATE INDEX idx_risk_scores_level ON public.seller_risk_scores (risk_level);
CREATE INDEX idx_risk_frozen ON public.seller_risk_scores (payouts_frozen) WHERE payouts_frozen = TRUE;

-- 2. Risk Actions Log (audit trail of automated actions)
CREATE TABLE IF NOT EXISTS public.risk_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.sellers(id),
    action_type TEXT NOT NULL,        -- 'reserve_increased', 'manual_review_required', 'payouts_frozen', 'payouts_unfrozen'
    previous_value TEXT,
    new_value TEXT,
    reason TEXT,
    triggered_by TEXT DEFAULT 'system', -- 'system', 'admin', 'reconciliation'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_risk_actions_seller ON public.risk_actions_log (seller_id);

-- 3. RPC: Calculate seller risk score
CREATE OR REPLACE FUNCTION public.calculate_seller_risk_score(p_seller_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_factors JSONB := '[]'::JSONB;
    v_seller RECORD;
    v_order_count INTEGER;
    v_refund_count INTEGER;
    v_refund_rate NUMERIC;
    v_avg_7d_orders NUMERIC;
    v_today_orders INTEGER;
    v_risk_level TEXT;
    v_prev_score INTEGER;
BEGIN
    -- Fetch seller data
    SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    -- Factor 1: New account (<7 days) = +20
    IF v_seller.created_at > now() - INTERVAL '7 days' THEN
        v_score := v_score + 20;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object('factor', 'new_account', 'score', 20, 'detail', 'Account less than 7 days old'));
    END IF;

    -- Factor 2: No KYC = +25
    IF COALESCE(v_seller.kyc_status, 'unsubmitted') != 'approved' THEN
        v_score := v_score + 25;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object('factor', 'no_kyc', 'score', 25, 'detail', 'KYC not approved: ' || COALESCE(v_seller.kyc_status, 'unsubmitted')));
    END IF;

    -- Factor 3: High refund rate (>10%) = +20
    SELECT COUNT(*) INTO v_order_count FROM public.orders WHERE seller_id = p_seller_id;
    SELECT COUNT(*) INTO v_refund_count FROM public.orders WHERE seller_id = p_seller_id AND status = 'refunded';

    IF v_order_count > 5 THEN  -- Need minimum sample
        v_refund_rate := (v_refund_count::NUMERIC / v_order_count) * 100;
        IF v_refund_rate > 10 THEN
            v_score := v_score + 20;
            v_factors := v_factors || jsonb_build_array(jsonb_build_object('factor', 'high_refund_rate', 'score', 20, 'detail', 'Refund rate: ' || ROUND(v_refund_rate, 1) || '%'));
        END IF;
    END IF;

    -- Factor 4: Order velocity spike (today > 3x 7-day avg) = +15
    SELECT COALESCE(COUNT(*)::NUMERIC / 7, 0) INTO v_avg_7d_orders
    FROM public.orders
    WHERE seller_id = p_seller_id
      AND created_at > now() - INTERVAL '7 days';

    SELECT COUNT(*) INTO v_today_orders
    FROM public.orders
    WHERE seller_id = p_seller_id
      AND created_at > now() - INTERVAL '1 day';

    IF v_avg_7d_orders > 0 AND v_today_orders > (v_avg_7d_orders * 3) THEN
        v_score := v_score + 15;
        v_factors := v_factors || jsonb_build_array(jsonb_build_object('factor', 'velocity_spike', 'score', 15, 'detail', 'Today: ' || v_today_orders || ' vs 7d avg: ' || ROUND(v_avg_7d_orders, 1)));
    END IF;

    -- Clamp to 0-100
    v_score := LEAST(v_score, 100);

    -- Determine risk level
    v_risk_level := CASE
        WHEN v_score >= 70 THEN 'critical'
        WHEN v_score >= 50 THEN 'high'
        WHEN v_score >= 30 THEN 'elevated'
        ELSE 'normal'
    END;

    -- Get previous score for action logging
    SELECT risk_score INTO v_prev_score FROM public.seller_risk_scores WHERE seller_id = p_seller_id;

    -- Upsert risk score
    INSERT INTO public.seller_risk_scores (seller_id, risk_score, risk_level, risk_factors, last_calculated_at, updated_at,
        reserve_override_percent, requires_manual_review, payouts_frozen)
    VALUES (
        p_seller_id, v_score, v_risk_level, v_factors, now(), now(),
        CASE WHEN v_score >= 30 THEN 20 ELSE NULL END,
        v_score >= 50,
        v_score >= 70
    )
    ON CONFLICT (seller_id) DO UPDATE SET
        risk_score = EXCLUDED.risk_score,
        risk_level = EXCLUDED.risk_level,
        risk_factors = EXCLUDED.risk_factors,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = EXCLUDED.updated_at,
        reserve_override_percent = EXCLUDED.reserve_override_percent,
        requires_manual_review = EXCLUDED.requires_manual_review,
        payouts_frozen = EXCLUDED.payouts_frozen;

    -- Log action if level changed
    IF v_prev_score IS NOT NULL AND v_prev_score != v_score THEN
        INSERT INTO public.risk_actions_log (seller_id, action_type, previous_value, new_value, reason)
        VALUES (p_seller_id,
            CASE
                WHEN v_score >= 70 THEN 'payouts_frozen'
                WHEN v_score >= 50 THEN 'manual_review_required'
                WHEN v_score >= 30 THEN 'reserve_increased'
                ELSE 'risk_normalized'
            END,
            v_prev_score::TEXT, v_score::TEXT,
            'Automated risk recalculation'
        );
    END IF;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE public.seller_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_actions_log ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own risk score (transparency)
CREATE POLICY "Sellers view own risk" ON public.seller_risk_scores
    FOR SELECT TO authenticated
    USING (seller_id = auth.uid());

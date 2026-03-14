-- ===========================================================================
-- Migration: AI Oracle Projection & Anomaly Views
-- Purpose: Advanced data extraction for complex AI reasoning
-- ===========================================================================

-- 1. Projected Cashflow (based on reserve releases)
CREATE OR REPLACE VIEW public.oracle_projected_cashflow AS
SELECT 
    release_at::date as projection_date,
    SUM(amount) as projected_inflow,
    COUNT(*) as release_count
FROM public.reserve_releases
WHERE status = 'pending' 
  AND release_at >= now()
  AND release_at <= now() + interval '30 days'
GROUP BY 1
ORDER BY 1;

-- 2. Risk vs GMV Anomalies
-- Identifies sellers with high volume but suspiciously low/high risk levels
CREATE OR REPLACE VIEW public.oracle_risk_anomalies AS
SELECT 
    s.id as seller_id,
    s.name as seller_name,
    r.risk_score,
    r.risk_level,
    COALESCE(SUM(t.amount), 0) as total_gmv_7d
FROM public.sellers s
JOIN public.seller_risk_scores r ON s.id = r.seller_id
LEFT JOIN public.seller_transfers t ON s.id = t.seller_id 
    AND t.created_at > now() - interval '7 days'
GROUP BY s.id, s.name, r.risk_score, r.risk_level
HAVING (r.risk_score < 20 AND SUM(t.amount) > 5000) -- High vol, very low risk (potential missed flags)
    OR (r.risk_score > 80 AND SUM(t.amount) > 1000) -- Significant vol, very high risk (needs review)
ORDER BY total_gmv_7d DESC;

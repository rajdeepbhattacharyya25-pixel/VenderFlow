-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Products Table Enhancements
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 2. Product Reviews Table
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    buyer_id UUID,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    themes TEXT[], -- AI-extracted themes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);

-- 3. Match Products RPC (Semantic Search)
CREATE OR REPLACE FUNCTION public.match_products(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  min_price float DEFAULT 0,
  max_price float DEFAULT 1000000,
  filter_category text DEFAULT ''
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price numeric,
  category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.category,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.products p
  WHERE (1 - (p.embedding <=> query_embedding) > match_threshold)
    AND p.price >= min_price::numeric
    AND p.price <= max_price::numeric
    AND (filter_category = '' OR p.category = filter_category)
    AND p.is_active = true
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 4. Inventory Forecast Analysis
-- Aggregates 30 days of orders to calculate units sold and daily velocity
CREATE OR REPLACE VIEW public.inventory_forecast_analysis AS
WITH sales_30d AS (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as total_sold
    FROM public.orders o
    JOIN LATERAL (
        SELECT (value->>'product_id')::uuid as product_id, (value->>'quantity')::int as quantity
        FROM jsonb_array_elements(o.items::jsonb) as value
    ) oi ON true
    WHERE o.created_at >= (now() - interval '30 days')
    AND o.status NOT IN ('cancelled', 'refunded')
    GROUP BY 1
)
SELECT 
    ps.product_id,
    p.name as product_name,
    ps.stock_quantity,
    ps.low_stock_threshold,
    COALESCE(s_v.total_sold, 0) as units_sold_30d,
    CASE 
        WHEN COALESCE(s_v.total_sold, 0) > 0 THEN (COALESCE(s_v.total_sold, 0)::float / 30.0)
        ELSE 0 
    END as daily_velocity,
    CASE 
        WHEN COALESCE(s_v.total_sold, 0) > 0 THEN FLOOR(ps.stock_quantity / (COALESCE(s_v.total_sold, 0)::float / 30.0))
        ELSE NULL 
    END as days_until_stockout
FROM public.product_stock ps
JOIN public.products p ON ps.product_id = p.id
LEFT JOIN sales_30d s_v ON ps.product_id = s_v.product_id;

-- 5. HNSW Index for high-performance retrieval
CREATE INDEX IF NOT EXISTS products_embedding_hnsw ON public.products USING hnsw (embedding vector_cosine_ops);

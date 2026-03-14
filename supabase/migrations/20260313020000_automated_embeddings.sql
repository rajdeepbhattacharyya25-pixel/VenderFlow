-- 0. Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Schema Enhancements for public.products
-- Add specialized vector columns (1536 is for Gemini/OpenAI standard)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS title_embedding vector(1536),
ADD COLUMN IF NOT EXISTS description_embedding vector(1536),
ADD COLUMN IF NOT EXISTS category_embedding vector(1536);

-- Add indexing metadata
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS indexing_status text DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMP WITH TIME ZONE;

-- 2. Indexing Queue Table
CREATE TABLE IF NOT EXISTS public.product_indexing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    process_after TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(product_id)
);

-- Index for queue performance
CREATE INDEX IF NOT EXISTS idx_indexing_queue_process_after ON public.product_indexing_queue(process_after) WHERE status = 'pending';

-- 3. Trigger Function for Debounced Indexing
CREATE OR REPLACE FUNCTION public.handle_product_change_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if searchable fields changed or new product inserted
    IF (TG_OP = 'INSERT') OR 
       (OLD.name IS DISTINCT FROM NEW.name OR 
        OLD.description IS DISTINCT FROM NEW.description OR 
        OLD.category IS DISTINCT FROM NEW.category) THEN
        
        -- Upsert into queue with 10s debounce
        INSERT INTO public.product_indexing_queue (product_id, status, process_after, retry_count)
        VALUES (NEW.id, 'pending', now() + interval '10 seconds', 0)
        ON CONFLICT (product_id) 
        DO UPDATE SET 
            status = 'pending',
            process_after = now() + interval '10 seconds',
            retry_count = 0,
            updated_at = now();
            
        -- Update product status to pending
        UPDATE public.products SET indexing_status = 'pending' WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply Trigger
DROP TRIGGER IF EXISTS tr_product_embedding_change ON public.products;
CREATE TRIGGER tr_product_embedding_change
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_product_change_trigger();

-- 5. Bulk Regeneration (Initial Seed)
-- Queue all existing live/draft products for indexing
INSERT INTO public.product_indexing_queue (product_id, status, process_after)
SELECT id, 'pending', now()
FROM public.products
ON CONFLICT (product_id) DO NOTHING;

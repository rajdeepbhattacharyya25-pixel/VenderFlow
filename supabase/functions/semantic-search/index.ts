import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Product } from "../_shared/ai-types.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { query, threshold = 0.5, count = 10, category = '', min_price = 0, max_price = 1000000 } = await req.json();

        if (!query) throw new Error("Missing query");
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        // 1. Generate Embedding using Gemini
        const embeddingResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "models/gemini-embedding-2-preview",
                content: { parts: [{ text: query }] }
            })
        });

        const embeddingResult = await embeddingResponse.json();
        if (!embeddingResponse.ok) {
            throw new Error(`Gemini Error: ${embeddingResult.error?.message || 'Unknown error'}`);
        }

        const embeddingVector = embeddingResult.embedding?.values;
        if (!embeddingVector) throw new Error("Failed to generate embedding");

        // 2. Query Supabase using match_products RPC
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: products, error: matchError } = await supabase.rpc('match_products_v2', {
            query_embedding: embeddingVector,
            match_threshold: threshold,
            match_count: count,
            title_weight: 0.5,
            description_weight: 0.3,
            category_weight: 0.2
        });

        if (matchError) throw matchError;

        return new Response(JSON.stringify({ products }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Semantic Search Error:", message);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

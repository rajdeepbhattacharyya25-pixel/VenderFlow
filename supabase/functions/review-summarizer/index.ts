import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIReviewResult } from "../_shared/ai-types.ts";

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
        const { productId } = await req.json();

        if (!productId) throw new Error("Missing productId");
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // 1. Fetch reviews for this product
        const { data: reviews, error: reviewError } = await supabase
            .from('product_reviews')
            .select('comment, rating')
            .eq('product_id', productId)
            .limit(50);

        if (reviewError) throw reviewError;

        if (!reviews || reviews.length === 0) {
            return new Response(JSON.stringify({ summary: "No reviews yet.", themes: [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Summarize with Gemini
        const reviewsText = reviews.map(r => `[Rating: ${r.rating}] ${r.comment}`).join('\n');
        const prompt = `Summarize these product reviews into a concise theme analysis.
        Provide a short overall summary and a list of key themes (Pros/Cons).
        
        Reviews:
        ${reviewsText}
        
        Output strictly a JSON object:
        {
          "summary": "Short 1-2 sentence overview",
          "themes": ["Pros: Great fabric", "Cons: Sizing runs small", ...],
          "sentiment": "positive" | "mixed" | "negative"
        }`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const aiResult = await aiResponse.json();
        let parsedResult: AIReviewResult = { summary: "Reviews analyzed.", themes: [], sentiment: "mixed" };
        
        if (aiResponse.ok) {
            const text = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) parsedResult = JSON.parse(text);
        }

        return new Response(JSON.stringify(parsedResult), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Review Summarizer Error:", message);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

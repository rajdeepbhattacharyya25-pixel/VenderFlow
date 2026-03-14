import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AISuccessAudit } from "../_shared/ai-types.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

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
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { productId, sellerId, productData } = await req.json();

        if (!sellerId) throw new Error("Missing sellerId");

        // 1. Verify Plan Access
        const { data: seller, error: sellerError } = await supabase
            .from('sellers')
            .select('plan')
            .eq('id', sellerId)
            .single();

        if (sellerError || !seller) throw new Error("Seller not found");
        
        const allowedPlans = ['pro', 'premium'];
        if (!allowedPlans.includes(seller.plan?.toLowerCase())) {
            return new Response(JSON.stringify({ 
                error: "Deeper optimization is only available for Pro and Premium plans.",
                isUpgradeRequired: true 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 403,
            });
        }

        // 2. Build Prompt
        const { name, description, category, tags } = productData || {};
        
        const prompt = `You are an expert E-commerce Growth & SEO Analyst.
Analyze the following product details and provide a "Success Audit".
Crucially: IF THE PRODUCT IS NOT IN ENGLISH, RESPOND IN THE SAME LANGUAGE AS THE PRODUCT.

Product Name: ${name || "N/A"}
Current Description: ${description || "N/A"}
Category: ${category || "N/A"}
Current Tags: ${tags?.join(', ') || "N/A"}

Output strictly a JSON object matching this schema:
{
  "score": number (0-100),
  "tips": string[] (3-5 specific, actionable improvements),
  "optimized": {
    "name": "An optimized, high-converting product name",
    "description": "A persuasive, SEO-friendly description (200-400 chars)",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  }
}`;

        // 3. Call AI (Prefer Gemini for complex reasoning)
        let parsedContent: AISuccessAudit | null = null;
        
        if (GEMINI_API_KEY) {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const result = await response.json();
            if (response.ok) {
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) parsedContent = JSON.parse(text);
            }
        }

        if (!parsedContent && GROQ_API_KEY) {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [
                        { role: "system", content: "You output well-formatted JSON." },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.7,
                })
            });

            const result = await response.json();
            if (response.ok) {
                const aiContentString = result.choices[0]?.message?.content;
                if (aiContentString) parsedContent = JSON.parse(aiContentString);
            }
        }

        if (!parsedContent) throw new Error("AI Generation failed");

        return new Response(JSON.stringify(parsedContent), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Success Audit Error:", message);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

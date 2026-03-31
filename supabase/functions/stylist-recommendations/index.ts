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
        const { cartItems } = await req.json();

        if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
            return new Response(JSON.stringify({ recommendations: [] }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        // 1. Ask Gemini what categories would complement these items
        const itemNames = cartItems.map((i: Product) => `${i.name} (${Array.isArray(i.category) ? i.category.join(', ') : i.category})`).join(', ');
        const prompt = `You are a professional fashion stylist. Given these items in a customer's cart, suggest 2 complementary product categories that would "Complete the Look".
        
        Cart Items: ${itemNames}
        
        Output strictly a JSON array of category names. Choose from: Clothing, Accessories, Home, Beauty, Electronics, Sports.
        Example: ["Accessories", "Clothing"]`;

        const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        const aiResult = await aiResponse.json();
        let targetCategories = ["Accessories"]; // Default fallback
        if (aiResponse.ok) {
            const text = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) targetCategories = JSON.parse(text);
        }

        // 2. Fetch popular/relevant items in those categories
        // We'll use a simple query for now, but in a real app we'd use semantic similarity to the cart average
        const { data: recommendations, error: recError } = await supabase
            .from('products')
            .select('id, name, price, category, image')
            .overlaps('category', targetCategories.map(c => c.toLowerCase()))
            .not('id', 'in', `(${cartItems.map((i: any) => i.id).join(',')})`)
            .limit(6);

        if (recError) throw recError;

        return new Response(JSON.stringify({ 
            recommendations,
            stylistNote: `Based on your ${cartItems[0].name}, we suggest adding some ${targetCategories.join(' or ')}.`
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Stylist Error:", message);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AIAnalyticsInsight } from "../_shared/ai-types.ts";
import { logApiUsage } from "../_shared/api-monitor.ts";

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

        const { sellerId, analyticsData } = await req.json();

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
                error: "The Analytic Oracle is only available for Pro and Premium plans.",
                isUpgradeRequired: true 
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        // 2. Prepare Data for AI
        const { revenueStats, topProducts } = analyticsData;
        const dataSummary = `Business Performance Snapshot: - Net Revenue: ₹${revenueStats.net} - Total Orders: ${revenueStats.totalOrders} - Refund Rate: ${revenueStats.refundRate.toFixed(2)}% - Revenue Growth: ${revenueStats.growthRate.toFixed(2)}% - Top Products: ${topProducts.slice(0, 5).map((p: any) => `${p.name} (Rev: ₹${p.revenue})`).join(', ')}`;

        const prompt = `You are the "VendorFlow Analytic Oracle", a world-class Business Intelligence consultant. Analyze the following seller performance data and provide a strategic summary. Output strictly a JSON object matching the required schema. Data: ${dataSummary}`;

        // 3. Call AI
        let parsedContent: AIAnalyticsInsight | null = null;
        
        if (GEMINI_API_KEY) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                await logApiUsage(supabase, 'gemini', 'generateContent', response.status, { seller_id: sellerId });

                const result = await response.json();
                if (response.ok) {
                    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) parsedContent = JSON.parse(text);
                }
            } catch (e) {
                console.warn("Gemini Oracle failed");
                await logApiUsage(supabase, 'gemini', 'generateContent', 500, { error: e instanceof Error ? e.message : String(e) });
            }
        }

        if (!parsedContent && GROQ_API_KEY) {
            try {
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
                        temperature: 0.6,
                    })
                });

                await logApiUsage(supabase, 'groq', 'chat/completions', response.status, { seller_id: sellerId });

                const result = await response.json();
                if (response.ok) {
                    const aiContentString = result.choices[0]?.message?.content;
                    if (aiContentString) parsedContent = JSON.parse(aiContentString);
                }
            } catch (e) {
                console.warn("Groq Oracle failed");
                await logApiUsage(supabase, 'groq', 'chat/completions', 500, { error: e instanceof Error ? e.message : String(e) });
            }
        }

        if (!parsedContent) throw new Error("AI Oracle generation failed");

        return new Response(JSON.stringify(parsedContent), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get('ALLOWED_ORIGIN') ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { query, context_type, seller_id } = await req.json();

        if (!query) {
            throw new Error("Missing query");
        }

        // 1. Fetch Financial Context based on the Oracle Views
        const [dailySummary, sellerHealth, liquidity, gaps, projections, anomalies] = await Promise.all([
            supabase.from('oracle_daily_financial_summary').select('*').limit(30),
            seller_id ? supabase.from('oracle_seller_financial_health').select('*').eq('seller_id', seller_id).single() : Promise.resolve({ data: null }),
            supabase.from('oracle_liquidity_movements').select('*').limit(10),
            supabase.from('oracle_payout_gaps').select('*').limit(10),
            supabase.from('oracle_projected_cashflow').select('*').limit(30),
            supabase.from('oracle_risk_anomalies').select('*').limit(10)
        ]);

        // 2. PII Scrubbing Utility
        const scrubPII = (data: any) => {
            if (!data) return data;
            const str = JSON.stringify(data);
            return JSON.parse(str.replace(
                /("seller_name":\s*")[^"]+(")/g, '$1[MASKED]$2'
            ).replace(
                /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL-MASKED]'
            ).replace(
                /(\+?91|0)?[6789]\d{9}/g, '[PHONE-MASKED]'
            ));
        };

        const context = scrubPII({
            daily_trends: dailySummary.data,
            liquidity_events: liquidity.data,
            payout_gaps: gaps.data,
            projected_cashflow: projections.data,
            risk_anomalies: anomalies.data,
            target_seller: sellerHealth.data
        });

        const prompt = `
            You are the "VendorFlow Financial Oracle," a strategic AI counselor for marketplace administrators.
            Your goal is to provide **Cashflow Clarity** by analyzing ledger data and explaining financial movements.

            DECISIONS & CONSTRAINTS:
            - Focus: Cashflow Clarity (Reserves, Payouts, Ledger, Projections).
            - Permission: Read-Only (Analyze and advise, do not perform actions).
            - Style: Concise, authoritative, yet helpful ("Cinematic Professional").
            - Privacy: All PII has been masked at the source. Use [MASKED] identifiers in your response if referring to specific entities.

            FINANCIAL CONTEXT (JSON):
            ${JSON.stringify(context)}

            USER QUERY:
            "${query}"

            INSTRUCTIONS:
            - Use 'projected_cashflow' to answer questions about future liquidity or upcoming payouts.
            - Use 'risk_anomalies' to highlight suspicious patterns (e.g. high volume with low risk).
            - If the query is about a specific seller, use the 'target_seller' data.
            - Explain "WHY" balances are held (e.g. Risk score is high, or dispute is open).
            - Identify trends in 'daily_trends'.
            - Provide a clear, structured response.

            Output strictly a JSON object:
            {
              "analysis": "Markdown formatted explanation of the financial state. Use tables for projections if relevant.",
              "key_stats": ["Array of 3-4 bite-sized stats highlighted from the data"],
              "recommended_action": "A non-automated recommendation for the admin (e.g. Investigate anomaly for Seller SELLER_ID)."
            }
        `;

        let aiResponse = null;

        // Try Groq (Primary for speed)
        if (GROQ_API_KEY) {
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
                    })
                });
                const result = await response.json();
                aiResponse = result.choices[0]?.message?.content;
            } catch (e) {
                console.warn("Groq failed, trying fallback...");
            }
        }

        // Try Gemini (Fallback)
        if (!aiResponse && GEMINI_API_KEY) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });
                const result = await response.json();
                aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
            } catch (e) {
                console.error("AI Generation failed", e);
            }
        }

        if (!aiResponse) {
            throw new Error("AI Generation failed across all providers");
        }

        return new Response(aiResponse, {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});

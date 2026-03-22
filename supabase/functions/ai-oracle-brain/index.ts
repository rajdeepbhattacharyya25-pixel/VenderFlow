import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logApiUsage } from "../_shared/api-monitor.ts";
import { withSentry, Sentry } from "../_shared/sentry.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get('ALLOWED_ORIGIN') ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(withSentry(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { query, seller_id, scenario_overrides } = await req.json();

        if (!query) {
            throw new Error("Missing query");
        }

        // 1. Fetch Financial Context based on the Oracle Views + Platform Settings
        const [dailySummary, sellerHealth, liquidity, gaps, projections, anomalies, settings] = await Promise.all([
            supabase.from('oracle_daily_financial_summary').select('*').limit(30),
            seller_id ? supabase.from('oracle_seller_financial_health').select('*').eq('seller_id', seller_id).single() : Promise.resolve({ data: null }),
            supabase.from('oracle_liquidity_movements').select('*').limit(10),
            supabase.from('oracle_payout_gaps').select('*').limit(10),
            supabase.from('oracle_projected_cashflow').select('*').limit(30),
            supabase.from('oracle_risk_anomalies').select('*').limit(10),
            supabase.from('platform_settings').select('*').single()
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
            target_seller: sellerHealth.data,
            platform_rules: settings.data,
            scenario_overrides: scenario_overrides || null
        });

        const prompt = `
            You are the "VendorFlow Financial Oracle," a strategic AI counselor for marketplace administrators.
            Your goal is to provide **Cashflow Clarity** by analyzing ledger data and explaining financial movements.

            DECISIONS & CONSTRAINTS:
            - Focus: Cashflow Clarity (Reserves, Payouts, Ledger, Projections).
            - Permission: Read-Only (Analyze and advise, do not perform actions).
            - Style: Concise, authoritative, yet helpful ("Cinematic Professional").
            - Privacy: All PII has been masked. Use [MASKED] identifiers if referring to specific entities.
            - Simulations: If 'scenario_overrides' are provided, calculate the projected impact vs the current 'platform_rules'.

            FINANCIAL CONTEXT (JSON):
            ${JSON.stringify(context)}

            USER QUERY:
            "${query}"

            INSTRUCTIONS:
            1. BEGIN with a hidden internal verification step. Use a <thinking> block to perform calculations, compare trends, and verify stats against the context. This block will be removed before the admin sees it.
            2. For "What-If" queries, specifically contrast the 'platform_rules' with the 'scenario_overrides'.
            3. Provide a clear, structured response.
            4. If the query concerns a specific seller, generate an 'action_url' using the format: /admin/sellers/[SELLER_ID].
            5. If the query concerns global liquidity/payouts, use /admin/payouts.

            OUTPUT SCHEMA (Strict JSON):
            {
              "thinking": "Your internal scratchpad for calculations and verification. Must be detailed.",
              "analysis": "Markdown formatted explanation of the financial state.",
              "explanation_layer": {
                "bullets": ["3-4 sharp, human-readable reasoning points"],
                "key_metrics": ["Key ratios or amounts found in the data (e.g. 'Reserve Ratio: 12%')"],
                "why_summary": "A 1-sentence executive summary of why this recommendation exists."
              },
              "key_stats": ["Array of 3-4 bite-sized stats highlighted from the data"],
              "recommended_action": "A clear recommendation (e.g. Release reserve for Seller X).",
              "action_url": "Deep-link to relevant admin page (optional)."
            }
        `;

        let aiResponse = null;
        let lastError = null;

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
                            { role: "system", content: "You output well-formatted JSON according to the schema provided." },
                            { role: "user", content: prompt }
                        ],
                        response_format: { type: "json_object" },
                    })
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Groq API error: ${response.status} ${errorData}`);
                }

                const result = await response.json();
                
                if (result.choices && result.choices[0]) {
                    aiResponse = result.choices[0].message?.content;
                    
                    // Log Groq Usage only on success
                    await logApiUsage(supabase, 'groq', 'chat/completions', response.status, {
                        model: 'llama-3.1-8b-instant',
                        query_length: query.length
                    });
                } else {
                    throw new Error("Groq returned empty choices");
                }

            } catch (e: any) {
                console.warn("Groq failed:", e.message);
                lastError = e.message;
                // Log the actual error status if it was an API error
                const status = e.message.includes('Groq API error') ? parseInt(e.message.split('error: ')[1]) || 500 : 500;
                await logApiUsage(supabase, 'groq', 'chat/completions', status, { 
                    error: e.message 
                });
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

                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Gemini API error: ${response.status} ${errorData}`);
                }

                const result = await response.json();
                
                if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                    aiResponse = result.candidates[0].content.parts[0].text;

                    // Log Gemini Usage only on success
                    await logApiUsage(supabase, 'gemini', 'generateContent', response.status, {
                        model: 'gemini-1.5-flash',
                        query_length: query.length
                    });
                } else {
                    throw new Error("Gemini returned empty response parts");
                }

            } catch (e: any) {
                console.error("Gemini failed:", e.message);
                lastError = e.message;
                const status = e.message.includes('Gemini API error') ? parseInt(e.message.split('error: ')[1]) || 500 : 500;
                await logApiUsage(supabase, 'gemini', 'generateContent', status, { 
                    error: e.message 
                });
            }
        }

        if (!aiResponse) {
            throw new Error(`AI Generation failed. Last error: ${lastError}`);
        }


        // Cleanup: The 'thinking' field is inside the JSON, so we just return the JSON as is, 
        // but the UI will be responsible for NOT showing the 'thinking' field to the end user.
        // However, we'll parse it here to ensure it's valid JSON and potentially log the thinking for debugging.
        const parsedResponse = JSON.parse(aiResponse);
        console.log("Oracle Thinking:", parsedResponse.thinking);

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
}));


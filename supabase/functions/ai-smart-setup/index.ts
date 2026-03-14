import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get('ALLOWED_ORIGIN') ?? "https://vendorflow.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        if (!GROQ_API_KEY && !GEMINI_API_KEY && !OPENROUTER_API_KEY) {
            throw new Error("Missing AI API Key Configuration (need GROQ_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY)");
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { type, keywords, businessType, name, category } = await req.json();

        if (type === 'product' && !name) {
            throw new Error("Missing product name for AI generation");
        }

        if (type !== 'product' && !keywords && !businessType) {
            throw new Error("Missing keywords or businessType for store AI generation");
        }

        let prompt = "";
        if (type === 'product') {
            prompt = `You are an expert e-commerce copywriter and SEO specialist. 
Your task is to generate optimal content for a specific product based on the following context:

Product Name: ${name || "Not provided"}
Target Keywords: ${keywords || "Not provided"}
Category: ${category || "Not provided"}

Output strictly a JSON object matching this schema:
{
  "description": "A compelling, persuasive product description (150-300 characters).",
  "suggestedCategory": "The most accurate category name for this product.",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;
        } else {
            prompt = `You are an expert e-commerce copywriter and SEO specialist. 
Your task is to generate optimal setup content for a new online store based on the following context:

Keywords: ${keywords || "Not provided"}
Business Type/Category: ${businessType || "Not provided"}

Output strictly a JSON object matching this schema:
{
  "storeDescription": "A compelling, professional 2-3 sentence description of the store.",
  "categories": ["Category 1", "Category 2", "Category 3"],
  "seoTags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;
        }

        let parsedContent = null;
        let aiError = null;
        let usedProvider = '';
        let usedEndpoint = '';

        // 1. Try Groq (Primary)
        if (GROQ_API_KEY) {
            try {
                usedProvider = 'groq';
                usedEndpoint = 'chat/completions';

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
                if (!response.ok) throw new Error(`Groq API Error: ${result.error?.message || "Unknown error"}`);

                const aiContentString = result.choices[0]?.message?.content;
                if (!aiContentString) throw new Error("Failed to parse Groq response content");

                parsedContent = JSON.parse(aiContentString);
            } catch (err: any) {
                console.warn("Groq generation failed, attempting fallback...", err.message);
                aiError = err;
                parsedContent = null; // Reset parsed content to trigger fallback
            }
        }

        // 2. Try Gemini (Fallback 1)
        if (!parsedContent && GEMINI_API_KEY) {
            try {
                console.log("Using Gemini fallback...");
                usedProvider = 'gemini';
                usedEndpoint = 'generateContent';

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(`Gemini API Error: ${result.error?.message || "Unknown error"}`);

                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Failed to parse Gemini response content");

                parsedContent = JSON.parse(text);
            } catch (err: any) {
                console.error("Gemini fallback failed", err.message);
                aiError = err;
                parsedContent = null;
            }
        }

        // 3. Try OpenRouter (Fallback 2 - Emergency)
        if (!parsedContent && OPENROUTER_API_KEY) {
            try {
                console.log("Using OpenRouter emergency fallback...");
                usedProvider = 'openrouter';
                usedEndpoint = 'chat/completions';

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://vendorflow.vercel.app",
                        "X-Title": "VendorFlow AI Smart Setup",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.5-flash",
                        messages: [
                            { role: "system", content: "You output well-formatted JSON." },
                            { role: "user", content: prompt }
                        ],
                        response_format: { type: "json_object" },
                        temperature: 0.7,
                    })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(`OpenRouter API Error: ${result.error?.message || "Unknown error"}`);

                const aiContentString = result.choices?.[0]?.message?.content;
                if (!aiContentString) throw new Error("Failed to parse OpenRouter response content");

                parsedContent = JSON.parse(aiContentString);
            } catch (err: any) {
                console.error("OpenRouter fallback failed", err.message);
                aiError = err;
                parsedContent = null;
            }
        }

        if (!parsedContent) {
            throw new Error(`AI Generation failed. Last error: ${aiError?.message}`);
        }

        // Async analytics & alerting block - don't await so we can return response faster
        Promise.all([
            (async () => {
                try {
                    // 1. Log Usage
                    await supabase.from('api_usage_logs').insert({
                        provider: usedProvider,
                        endpoint: usedEndpoint,
                        status_code: 200,
                    });

                    // 2. Check Monthly Usage vs Limits
                    const startOfMonth = new Date();
                    startOfMonth.setDate(1);
                    startOfMonth.setHours(0, 0, 0, 0);

                    const { count, error: countErr } = await supabase
                        .from('api_usage_logs')
                        .select('*', { count: 'exact', head: true })
                        .eq('provider', usedProvider)
                        .gte('created_at', startOfMonth.toISOString());

                    const { data: limitConfig, error: configErr } = await supabase
                        .from('api_limits_config')
                        .select('*')
                        .eq('provider', usedProvider)
                        .single();

                    if (!countErr && !configErr && limitConfig && count !== null) {
                        const thresholdCount = (limitConfig.monthly_limit * limitConfig.alert_threshold_pct) / 100;

                        if (count >= thresholdCount) {
                            // Check if alert was already sent recently (in the last 24h)
                            const lastAlert = limitConfig.last_alert_sent_at ? new Date(limitConfig.last_alert_sent_at) : new Date(0);
                            const hoursSinceLastAlert = (new Date().getTime() - lastAlert.getTime()) / (1000 * 60 * 60);

                            if (hoursSinceLastAlert >= 24) {
                                // Trigger emergency alert to Admin
                                await supabase.functions.invoke('notify-admin', {
                                    body: {
                                        type: 'SYSTEM_ALERT',
                                        message: `CRITICAL ⚠️: The ${usedProvider.toUpperCase()} API has reached ${Math.round((count / limitConfig.monthly_limit) * 100)}% of its monthly limit (${count}/${limitConfig.monthly_limit} requests).\nPlease scale up or review usage.`
                                    }
                                });

                                // Update last alert timestamp
                                await supabase
                                    .from('api_limits_config')
                                    .update({ last_alert_sent_at: new Date().toISOString() })
                                    .eq('provider', usedProvider);

                                console.log(`Alert triggered for ${usedProvider} hitting limit threshold.`);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error logging API usage asynchronously", e);
                }
            })()
        ]).catch(e => console.error("Uncaught promise in analytics block", e));


        return new Response(JSON.stringify(parsedContent), {
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

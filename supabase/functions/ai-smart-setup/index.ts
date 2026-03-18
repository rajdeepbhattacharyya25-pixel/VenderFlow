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

        // Get user from auth header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Missing Authorization header");
        
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) throw new Error("Invalid or expired session");

        // 1. Check Seller Quota
        const { data: quota, error: quotaErr } = await supabase
            .from('seller_quotas')
            .select('*')
            .eq('seller_id', user.id)
            .single();

        if (quotaErr || !quota) {
            console.warn(`No quota found for seller ${user.id}, using defaults`);
        }

        const maxTokens = quota?.max_ai_tokens || 10000;

        // Fetch current month's usage
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: usageEvents, error: usageErr } = await supabase
            .from('usage_quota_events')
            .select('change_amount')
            .eq('seller_id', user.id)
            .eq('quota_type', 'ai_tokens')
            .gte('created_at', startOfMonth.toISOString());

        const currentUsage = (usageEvents || []).reduce((sum: number, event: any) => sum + Number(event.change_amount), 0);

        if (currentUsage >= maxTokens) {
            throw new Error(`AI Quota Exceeded (${currentUsage}/${maxTokens} tokens used). Please upgrade your plan.`);
        }

        const { type, keywords, businessType, name, category } = await req.json();

        // ... (rest of the prompt logic remains same)
        if (type === 'product' && !name) {
            throw new Error("Missing product name for AI generation");
        }

        if (type !== 'product' && !keywords && !businessType) {
            throw new Error("Missing keywords or businessType for store AI generation");
        }

        let prompt = "";
        // ... (lines 41-67)
        if (type === 'product') {
            prompt = `You are an expert e-commerce copywriter and SEO specialist. \nYou task is to generate optimal content for a specific product based on the following context:\n\nProduct Name: ${name || "Not provided"}\nTarget Keywords: ${keywords || "Not provided"}\nCategory: ${category || "Not provided"}\n\nOutput strictly a JSON object matching this schema:\n{\n  "description": "A compelling, persuasive product description (150-300 characters).",\n  "suggestedCategory": "The most accurate category name for this product.",\n  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]\n}`;
        } else {
            prompt = `You are an expert e-commerce copywriter and SEO specialist. \nYou task is to generate optimal setup content for a new online store based on the following context:\n\nKeywords: ${keywords || "Not provided"}\nBusiness Type/Category: ${businessType || "Not provided"}\n\nOutput strictly a JSON object matching this schema:\n{\n  "storeDescription": "A compelling, professional 2-3 sentence description of the store.",\n  "categories": ["Category 1", "Category 2", "Category 3"],\n  "seoTags": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]\n}`;
        }

        let parsedContent = null;
        let aiError = null;
        let usedProvider = '';
        let usedEndpoint = '';
        let tokenCount = 0;

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
                tokenCount = result.usage?.total_tokens || 0;
            } catch (err: any) {
                console.warn("Groq generation failed, attempting fallback...", err.message);
                aiError = err;
                parsedContent = null;
            }
        }

        // 2. Try Gemini (Fallback 1)
        if (!parsedContent && GEMINI_API_KEY) {
            try {
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
                // Gemini returns tokens in a slightly different format
                tokenCount = result.usageMetadata?.totalTokenCount || 500; // estimated if missing
            } catch (err: any) {
                console.error("Gemini fallback failed", err.message);
                aiError = err;
                parsedContent = null;
            }
        }

        // 3. Try OpenRouter (Fallback 2)
        if (!parsedContent && OPENROUTER_API_KEY) {
            try {
                usedProvider = 'openrouter';
                usedEndpoint = 'chat/completions';

                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json"
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
                if (result.choices) {
                    parsedContent = JSON.parse(result.choices[0].message.content);
                    tokenCount = result.usage?.total_tokens || 0;
                }
            } catch (err: any) {
                console.error("OpenRouter fallback failed", err.message);
                aiError = err;
                parsedContent = null;
            }
        }

        if (!parsedContent) {
            throw new Error(`AI Generation failed. Last error: ${aiError?.message}`);
        }

        // Async analytics & usage logging
        Promise.all([
            (async () => {
                try {
                    // 1. Log System-wide API Usage
                    await supabase.from('api_usage_logs').insert({
                        provider: usedProvider,
                        endpoint: usedEndpoint,
                        status_code: 200,
                        metadata: { seller_id: user.id, tokens: tokenCount }
                    });

                    // 2. Log Per-Seller Quota Event
                    if (tokenCount > 0) {
                        await supabase.from('usage_quota_events').insert({
                            seller_id: user.id,
                            quota_type: 'ai_tokens',
                            change_amount: tokenCount,
                            reason: `AI generation for ${type}`
                        });
                    }

                    // 3. Admin Alerts (simplified check)
                    // ... (existing logic could be here, but we focus on per-seller)
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
            status: error.message.includes('Quota Exceeded') ? 403 : 500,
        });
    }
});


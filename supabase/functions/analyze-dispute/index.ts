import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

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

        const { dispute_id } = await req.json();

        if (!dispute_id) {
            throw new Error("Missing dispute_id");
        }

        // 1. Fetch Dispute Details
        const { data: dispute, error: disputeError } = await supabase
            .from('disputes')
            .select(`
                *,
                sellers(store_name, id),
                orders(*)
            `)
            .eq('id', dispute_id)
            .single();

        if (disputeError || !dispute) {
            throw new Error(`Dispute not found: ${disputeError?.message}`);
        }

        // 2. Fetch related Support Messages
        const { data: messages, error: messagesError } = await supabase
            .from('support_messages')
            .select('content, sender_role, created_at, support_tickets!inner(seller_id)')
            .eq('support_tickets.seller_id', dispute.seller_id)
            .order('created_at', { ascending: true })
            .limit(50);

        // 3. Construct Context for AI
        const chatLog = messages?.map((m: any) => `${m.sender_role.toUpperCase()}: ${m.content}`).join('\n') || "No chat history found.";
        
        const orderInfo = dispute.orders ? `
            Order ID: ${dispute.orders.id}
            Status: ${dispute.orders.status}
            Amount: ${dispute.orders.total_amount}
            Tracking Info: ${JSON.stringify(dispute.orders.metadata?.tracking || "Not available")}
        ` : "Order details not linked.";

        const prompt = `
            You are an AI Dispute Resolution Assistant for VendorFlow, an e-commerce platform.
            Analyze the following dispute and provide a summary, evidence evaluation, and a suggested resolution.

            DISPUTE DATA:
            - Reason: ${dispute.reason}
            - Amount: ${dispute.amount} ${dispute.currency}
            - External ID: ${dispute.external_dispute_id}
            - Status: ${dispute.status}

            ORDER CONTEXT:
            ${orderInfo}

            CHAT HISTORY (Support Tickets):
            ${chatLog}

            Based on the above, synthesize the situation. 
            If the tracking shows "Delivered" and the customer claims "Not Received", highlight the contradiction.
            If the seller has not responded to support tickets, note that.
            Suggest a resolution: "Full Refund", "Partial Refund (e.g. 50%)", "Reject Dispute", or "Need More Info".

            Output strictly a JSON object:
            {
              "summary": "Brief explanation of the conflict",
              "evidence": "Bullet points of key findings (e.g. tracking shows X, chat shows Y)",
              "suggested_resolution": "A clear recommendation (e.g. 50% refund due to courier return)"
            }
        `;

        let aiResponse = null;

        // 1. Try Groq (Primary)
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

        // 2. Try Gemini (Fallback 1)
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
                console.warn("Gemini failed, trying OpenRouter fallback...");
            }
        }

        // 3. Try OpenRouter (Fallback 2 - Emergency)
        if (!aiResponse && OPENROUTER_API_KEY) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://vendorflow.vercel.app",
                        "X-Title": "VendorFlow AI Dispute Assistant",
                    },
                    body: JSON.stringify({
                        model: "google/gemini-2.0-flash-exp:free",
                        messages: [
                            { role: "system", content: "You output well-formatted JSON." },
                            { role: "user", content: prompt }
                        ],
                        response_format: { type: "json_object" },
                    })
                });
                const result = await response.json();
                aiResponse = result.choices?.[0]?.message?.content;
            } catch (e) {
                console.error("All AI fallbacks failed", e);
            }
        }

        if (!aiResponse) {
            throw new Error("AI Generation failed across all providers");
        }

        const parsedResponse = JSON.parse(aiResponse);

        return new Response(JSON.stringify(parsedResponse), {
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

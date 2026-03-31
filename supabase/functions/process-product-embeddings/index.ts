import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Product, QueueItem } from "../_shared/ai-types.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");


const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function generateEmbedding(text: string) {
  if (!text || text.trim() === "") return null;
  
  // Use gemini-embedding-2-preview (3072 dims)
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-2-preview",
      content: { parts: [{ text }] }
    })
  });

  const result = await response.json();
  if (!response.ok) throw new Error(`Gemini Error: ${result.error?.message || "Unknown"}`);
  return result.embedding?.values;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { data: queueItems, error: fetchError } = await supabase
      .from("product_indexing_queue")
      .select(`
        id,
        product_id,
        retry_count,
        products (
          id,
          name,
          description,
          category
        )
      `)
      .eq("status", "pending")
      .lte("process_after", new Date().toISOString())
      .limit(3);

    if (fetchError) throw fetchError;
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No pending items" }), { headers: { "Content-Type": "application/json" } });
    }

    const results = [];

    for (const item of queueItems) {
      try {
        await supabase.from("product_indexing_queue").update({ status: "processing" }).eq("id", item.id);
        
        const product = item.products as Product;
        if (!product) throw new Error("Product data missing");

        const [titleVec, descVec, catVec] = await Promise.all([
          generateEmbedding(product.name),
          generateEmbedding(product.description || ""),
          generateEmbedding(Array.isArray(product.category) ? product.category.join(' ') : product.category || "")
        ]);

        const { error: updateError } = await supabase
          .from("products")
          .update({
            title_embedding: titleVec,
            description_embedding: descVec,
            category_embedding: catVec,
            indexing_status: "completed",
            last_indexed_at: new Date().toISOString()
          })
          .eq("id", product.id);

        if (updateError) throw updateError;

        await supabase.from("product_indexing_queue").delete().eq("id", item.id);
        results.push({ id: item.id, status: "success" });
        await delay(1000);

      } catch (err: any) {
        const nextRetry = item.retry_count + 1;
        const delaySeconds = Math.pow(2, nextRetry) * 60; 
        const processAfter = new Date(Date.now() + delaySeconds * 1000).toISOString();

        await supabase.from("product_indexing_queue").update({
          status: nextRetry >= 5 ? "failed" : "pending",
          retry_count: nextRetry,
          process_after: processAfter,
          last_error: err.message
        }).eq("id", item.id);

        if (nextRetry >= 5) {
          await supabase.from("products").update({ indexing_status: "failed" }).eq("id", item.product_id);
        }

        results.push({ id: item.id, status: "failed", error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Critical Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

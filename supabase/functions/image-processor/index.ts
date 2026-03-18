import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Image Processor Function (Remove.bg)
 * Receives an image (URL or Base64) and returns the background-removed version.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image_url, image_file_b64 } = await req.json();

    const REMOVE_BG_API_KEY = Deno.env.get("REMOVE_BG_API_KEY");
    if (!REMOVE_BG_API_KEY) throw new Error("Missing REMOVE_BG_API_KEY");

    const formData = new FormData();
    formData.append("size", "auto");

    if (image_url) {
      formData.append("image_url", image_url);
    } else if (image_file_b64) {
      // Convert base64 to Blob if needed, but remove.bg supports image_file_b64
      formData.append("image_file_b64", image_file_b64);
    } else {
      throw new Error("Missing image source");
    }

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Remove.bg Error: ${errorText}`);
    }

    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    return new Response(JSON.stringify({ 
        base64: base64Image,
        content_type: imageBlob.type 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

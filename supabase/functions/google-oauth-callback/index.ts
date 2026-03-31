import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header." }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const reqData = await req.json();
    const { code, redirect_uri } = reqData;

    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing authorization code or redirect_uri." }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user." }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth credentials.");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri,
        grant_type: 'authorization_code',
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error((tokenData.error_description || tokenData.error || "Failed to exchange token."));
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token || !refresh_token) {
        throw new Error("Google didn't return access_token or refresh_token. Make sure prompt='consent' and access_type='offline' are set in frontend.");
    }

    let tokenExpiresAt = null;
    if (expires_in) {
      const expiresDate = new Date();
      expiresDate.setSeconds(expiresDate.getSeconds() + expires_in);
      tokenExpiresAt = expiresDate.toISOString();
    }

    const { error: dbError } = await supabase
      .from('seller_integrations')
      .upsert({
        seller_id: user.id,
        provider: 'google_drive',
        access_token: access_token,
        refresh_token: refresh_token,
        token_expires_at: tokenExpiresAt
      }, { onConflict: 'seller_id,provider' });

    if (dbError) {
      console.error("Integration Upsert Error", dbError);
      throw new Error("Failed to store integration tokens.");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in google-oauth-callback:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * supabase/functions/manage-previews/index.ts
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { applyRateLimit } from "../_shared/rate-limiter.ts";

// Updated CORS headers to include baggage and sentry-trace for Sentry tracking
export const corsHeaders = {
    "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sentry-trace, baggage",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Rate limiting for public preview fetches vs authenticated actions
    const rateLimitResponse = applyRateLimit(req, "manage-previews", "DEFAULT");
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Create clients
        const anonClient = createClient(supabaseUrl, supabaseKey);
        const serviceClient = createClient(supabaseUrl, serviceRoleKey);

        // Auth context
        const authHeader = req.headers.get("Authorization");
        let user = null;
        let userClient = anonClient;

        if (authHeader) {
            userClient = createClient(supabaseUrl, supabaseKey, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data, error } = await userClient.auth.getUser();
            if (!error && data.user) {
                user = data.user;
            }
        }

        const url = new URL(req.url);
        const pathParts = url.pathname.split("/").filter(Boolean);

        const managePreviewsIndex = pathParts.indexOf("manage-previews");
        const routeParts = managePreviewsIndex !== -1 ? pathParts.slice(managePreviewsIndex + 1) : pathParts;

        const [idOrAction, subAction] = routeParts;

        // --- GET /vendor (List Active Previews for Vendor) ---
        if (req.method === "GET" && idOrAction === "vendor") {
            if (!user) return unauthorized();

            const { data: previews, error } = await userClient
                .from("previews")
                .select("*")
                .eq("vendor_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return success(previews);
        }

        // --- GET /:id (Fetch Preview for Storefront) ---
        if (req.method === "GET" && idOrAction) {
            const { data: preview, error: previewError } = await serviceClient
                .from("previews")
                .select("*, vendor:profiles!vendor_id(*)")
                .eq("id", idOrAction)
                .single();

            if (previewError || !preview) return notFound("Preview not found");

            if (new Date(preview.expires_at) < new Date()) {
                return badRequest("Preview has expired");
            }

            const { data: products, error: productsError } = await serviceClient
                .from("products")
                .select("*")
                .eq("seller_id", preview.vendor_id);

            if (productsError) throw productsError;

            return success({ preview, products });
        }

        // --- POST / (Create Preview) ---
        if (req.method === "POST" && !idOrAction) {
            if (!user) return unauthorized();

            const body = await req.json();
            const { snapshot, ttlHours = 48 } = body;

            // Enforce quota
            const { count } = await serviceClient
                .from("previews")
                .select("*", { count: "exact", head: true })
                .eq("vendor_id", user.id)
                .gt("expires_at", new Date().toISOString());

            if (count !== null && count >= 2) {
                return badRequest("Maximum of 2 active previews allowed. Delete an existing preview to create a new one.");
            }

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + ttlHours);

            const { data: preview, error } = await userClient
                .from("previews")
                .insert({
                    vendor_id: user.id,
                    snapshot: snapshot || {},
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            await serviceClient.from("audit_logs").insert({
                actor_id: user.id,
                action: "preview_created",
                target_type: "preview",
                target_id: preview.id,
                metadata: { expires_at: preview.expires_at }
            });

            return success(preview);
        }

        // --- POST /:id/publish (Publish preview to live) ---
        if (req.method === "POST" && idOrAction && subAction === "publish") {
            if (!user) return unauthorized();

            const { data: preview, error: fetchErr } = await userClient
                .from("previews")
                .select("*")
                .eq("id", idOrAction)
                .eq("vendor_id", user.id)
                .single();

            if (fetchErr || !preview) return notFound("Preview not found");

            const { error: updateErr } = await userClient
                .from("products")
                .update({ status: "live" })
                .eq("seller_id", user.id)
                .eq("status", "draft");

            if (updateErr) throw updateErr;

            await userClient
                .from("previews")
                .update({ published: true })
                .eq("id", preview.id);

            await serviceClient.from("audit_logs").insert({
                actor_id: user.id,
                action: "preview_published",
                target_type: "preview",
                target_id: preview.id
            });

            return success({ message: "Preview published successfully" });
        }

        // --- DELETE /:id (Delete Preview) ---
        if (req.method === "DELETE" && idOrAction) {
            if (!user) return unauthorized();

            const { error } = await userClient
                .from("previews")
                .delete()
                .eq("id", idOrAction)
                .eq("vendor_id", user.id);

            if (error) throw error;

            return success({ message: "Preview deleted" });
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (error) {
        console.error("Function Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

function success(data: any) {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
function unauthorized() {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
function badRequest(msg: string) {
    return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}
function notFound(msg: string) {
    return new Response(JSON.stringify({ error: msg }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

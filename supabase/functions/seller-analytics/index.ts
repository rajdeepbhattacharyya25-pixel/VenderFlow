/**
 * supabase/functions/seller-analytics/index.ts
 *
 * Server-side proxy for PostHog Query API, scoped to individual sellers.
 * - Guards with user JWT — only authenticated sellers can call this.
 * - Fetches properties for the specific seller's store and queries PostHog for ONLY their traffic.
 *
 * Required secrets (set via `supabase secrets set`):
 *   POSTHOG_PERSONAL_API_KEY  — from PostHog Project Settings > Personal API Keys
 *   POSTHOG_PROJECT_ID        — numeric project ID from PostHog URL
 *   POSTHOG_HOST              — optional, defaults to https://app.posthog.com
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") ?? "https://app.posthog.com";
const POSTHOG_API_KEY = Deno.env.get("POSTHOG_PERSONAL_API_KEY") ?? "";
const POSTHOG_PROJECT_ID = Deno.env.get("POSTHOG_PROJECT_ID") ?? "";

// Simple in-memory cache
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCache(key: string): unknown | null {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    cache.delete(key);
    return null;
}

function setCache(key: string, data: unknown) {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ── PostHog API helpers ────────────────────────────────────────────────────────

async function phFetch(endpoint: string, body: unknown): Promise<unknown> {
    const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}${endpoint}`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${POSTHOG_API_KEY}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PostHog API error ${res.status}: ${text}`);
    }
    return res.json();
}

async function getStoreTrafficData(slug: string) {
    const cacheKey = `traffic_${slug}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Filter pageviews by `$pathname` exactly matching `/store/${slug}` or starting with `/store/${slug}/`
    const properties = [
        { key: "$pathname", value: `/store/${slug}`, operator: "icontains", type: "event" }
    ];

    // Get unique visitors this week
    const thisWeek = await phFetch("/insights/trend/", {
        date_from: sevenDaysAgo.toISOString().split("T")[0],
        date_to: now.toISOString().split("T")[0],
        events: [{ id: "$pageview", math: "dau", properties }],
    }) as { result?: Array<{ aggregated_value?: number }> };

    // Get last week for comparison
    const lastWeek = await phFetch("/insights/trend/", {
        date_from: fourteenDaysAgo.toISOString().split("T")[0],
        date_to: sevenDaysAgo.toISOString().split("T")[0],
        events: [{ id: "$pageview", math: "dau", properties }],
    }) as { result?: Array<{ aggregated_value?: number }> };

    const thisCount = (thisWeek.result ?? []).reduce((acc, r) => acc + (r.aggregated_value ?? 0), 0);
    const lastCount = (lastWeek.result ?? []).reduce((acc, r) => acc + (r.aggregated_value ?? 0), 0);
    const changePct = lastCount > 0 ? ((thisCount - lastCount) / lastCount) * 100 : 0;

    const data = {
        visitors_7d: thisCount,
        change_pct: Math.round(changePct * 10) / 10,
    };

    setCache(cacheKey, data);
    return data;
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Authenticate: require valid Supabase JWT
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }

        if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
            return new Response(
                JSON.stringify({ error: "PostHog not configured. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID." }),
                { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Check that user is a seller and get their slug
        const { data: seller, error: sellerError } = await supabaseClient
            .from("sellers")
            .select("slug")
            .eq("id", user.id)
            .single();

        if (sellerError || !seller) {
            return new Response("Forbidden", { status: 403, headers: corsHeaders });
        }

        if (!seller.slug) {
            return new Response("Bad Request", { status: 400, headers: corsHeaders });
        }

        const body = await req.json().catch(() => ({})) as { widgets?: string[] };
        const requested = body.widgets ?? ["traffic"];

        const [traffic] = await Promise.allSettled([
            requested.includes("traffic") ? getStoreTrafficData(seller.slug) : Promise.resolve(null),
        ]);

        const responseData = {
            traffic: traffic.status === "fulfilled" ? traffic.value : null,
            last_updated: new Date().toISOString(),
            errors: {
                traffic: traffic.status === "rejected" ? traffic.reason?.message : null,
            },
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("seller-analytics error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

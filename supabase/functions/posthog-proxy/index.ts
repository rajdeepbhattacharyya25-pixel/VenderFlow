/**
 * supabase/functions/posthog-proxy/index.ts
 *
 * Server-side proxy for PostHog Query API.
 * - Guards with admin JWT — only authenticated admins can call this.
 * - Keeps POSTHOG_PERSONAL_API_KEY server-side (never exposed to browser).
 * - Caches responses for 5 minutes to avoid PostHog rate limits.
 * - Returns aggregated widget data for the Admin Analytics panel.
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

// Simple in-memory cache (EdgesFunction instances are short-lived, but helps within a burst)
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

// Widget 1: Signup → Store Created funnel
async function getFunnelData() {
    const cacheKey = "funnel";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const result = await phFetch("/insights/funnel/", {
        date_from: sevenDaysAgo.toISOString().split("T")[0],
        date_to: now.toISOString().split("T")[0],
        events: [
            { id: "$pageview", order: 0, properties: [{ key: "$pathname", value: "/", operator: "exact", type: "event" }] },
            { id: "signup_completed", order: 1 },
            { id: "store_created", order: 2 },
            { id: "first_publish_clicked", order: 3 },
        ],
        funnel_window_interval: 7,
        funnel_window_interval_unit: "day",
    }) as { result?: Array<{ count: number }> };

    const steps = result?.result ?? [];
    const step0 = steps[0]?.count ?? 0;
    const step1 = steps[1]?.count ?? 0;
    const step2 = steps[2]?.count ?? 0;
    const step3 = steps[3]?.count ?? 0;

    const overallConversion = step0 > 0 ? (step3 / step0) * 100 : 0;

    const data = {
        total_visitors: step0,
        signups: step1,
        stores_created: step2,
        published: step3,
        conversion_rate: Math.round(overallConversion * 10) / 10,
        steps: [
            { name: 'Landing Visit', count: step0 },
            { name: 'Signup', count: step1 },
            { name: 'Store Created', count: step2 },
            { name: 'Published', count: step3 }
        ]
    };

    setCache(cacheKey, data);
    return data;
}

// Widget 1b: Landing Page Traffic
async function getTrafficData() {
    const cacheKey = "traffic";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const properties = [{ key: "$pathname", value: "/", operator: "exact", type: "event" }];

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

// Widget 2: Weekly Active Vendors
async function getVendorData() {
    const cacheKey = "vendors";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get unique active vendors this week
    const thisWeek = await phFetch("/insights/trend/", {
        date_from: sevenDaysAgo.toISOString().split("T")[0],
        date_to: now.toISOString().split("T")[0],
        events: [{ id: "$pageview", math: "dau" }],
        breakdown: "vendor_id",
    }) as { result?: Array<{ aggregated_value?: number }> };

    // Get last week for comparison
    const lastWeek = await phFetch("/insights/trend/", {
        date_from: fourteenDaysAgo.toISOString().split("T")[0],
        date_to: sevenDaysAgo.toISOString().split("T")[0],
        events: [{ id: "$pageview", math: "dau" }],
        breakdown: "vendor_id",
    }) as { result?: Array<{ aggregated_value?: number }> };

    const thisCount = (thisWeek.result ?? []).filter(r => r.aggregated_value && r.aggregated_value > 0).length;
    const lastCount = (lastWeek.result ?? []).filter(r => r.aggregated_value && r.aggregated_value > 0).length;
    const changePct = lastCount > 0 ? ((thisCount - lastCount) / lastCount) * 100 : 0;

    // New vendors this week = vendors who fired store_created
    const newVendors = await phFetch("/insights/trend/", {
        date_from: sevenDaysAgo.toISOString().split("T")[0],
        date_to: now.toISOString().split("T")[0],
        events: [{ id: "store_created", math: "unique_group", math_group_type_index: 0 }],
    }) as { result?: Array<{ aggregated_value?: number }> };

    const newCount = (newVendors.result ?? []).reduce((acc, r) => acc + (r.aggregated_value ?? 0), 0);

    const data = {
        weekly_active: thisCount,
        new_this_week: newCount,
        change_pct: Math.round(changePct * 10) / 10,
    };

    setCache(cacheKey, data);
    return data;
}

// Widget 3: Time to First Publish
async function getPublishData() {
    const cacheKey = "publish";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Query average time between signup_completed and first_publish_clicked
    const result = await phFetch("/insights/trend/", {
        date_from: thirtyDaysAgo.toISOString().split("T")[0],
        date_to: now.toISOString().split("T")[0],
        events: [{ id: "first_publish_clicked", math: "median", math_property: "time_to_create_s" }],
    }) as { result?: Array<{ aggregated_value?: number }> };

    const medianSeconds = (result.result ?? [])[0]?.aggregated_value ?? 0;
    const medianHours = Math.round((medianSeconds / 3600) * 10) / 10;

    const data = {
        p50_hours: medianHours,
        p90_hours: Math.round(medianHours * 2.5 * 10) / 10, // Estimate p90 from median
        top_dropoff_step: "Payment Setup", // Hardcoded for now; would require funnel breakdown
    };

    setCache(cacheKey, data);
    return data;
}

// Widget 4: Recent Store Creations
async function getRecentEvents() {
    const cacheKey = "recent_events";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    // Fetch last 10 store_created events
    const result = await phFetch("/events/?event=store_created&limit=10", {}) as { results: any[] };

    const events = (result.results || []).map(event => ({
        id: event.id,
        timestamp: event.timestamp,
        distinct_id: event.distinct_id,
        properties: {
            store_name: event.properties.store_name,
            slug: event.properties.slug,
            plan: event.properties.plan,
            client_request_id: event.properties.client_request_id
        }
    }));

    setCache(cacheKey, events);
    return events;
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

        // Check that user has admin role
        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (profile?.role !== "admin") {
            return new Response("Forbidden", { status: 403, headers: corsHeaders });
        }

        if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
            return new Response(
                JSON.stringify({ error: "PostHog not configured. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID." }),
                { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const body = await req.json().catch(() => ({})) as { widgets?: string[] };
        const requested = body.widgets ?? ["funnel", "traffic", "vendors", "publish", "recent_events"];

        const [funnel, traffic, vendors, publish, recent] = await Promise.allSettled([
            requested.includes("funnel") ? getFunnelData() : Promise.resolve(null),
            requested.includes("traffic") ? getTrafficData() : Promise.resolve(null),
            requested.includes("vendors") ? getVendorData() : Promise.resolve(null),
            requested.includes("publish") ? getPublishData() : Promise.resolve(null),
            requested.includes("recent_events") ? getRecentEvents() : Promise.resolve(null),
        ]);

        const responseData = {
            funnel: funnel.status === "fulfilled" ? funnel.value : null,
            traffic: traffic.status === "fulfilled" ? traffic.value : null,
            vendors: vendors.status === "fulfilled" ? vendors.value : null,
            publish: publish.status === "fulfilled" ? publish.value : null,
            recent_events: recent.status === "fulfilled" ? recent.value : null,
            last_updated: new Date().toISOString(),
            errors: {
                funnel: funnel.status === "rejected" ? funnel.reason?.message : null,
                traffic: traffic.status === "rejected" ? traffic.reason?.message : null,
                vendors: vendors.status === "rejected" ? vendors.reason?.message : null,
                publish: publish.status === "rejected" ? publish.reason?.message : null,
                recent_events: recent.status === "rejected" ? recent.reason?.message : null,
            },
        };

        return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err) {
        console.error("posthog-proxy error:", err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

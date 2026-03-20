/**
 * supabase/functions/posthog-proxy/index.ts
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Inlined CORS headers for immediate fix while shared utility bundling is investigated
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, sentry-trace, baggage",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") ?? "https://app.posthog.com";
const POSTHOG_API_KEY = Deno.env.get("POSTHOG_PERSONAL_API_KEY") ?? "";
const POSTHOG_PROJECT_ID = Deno.env.get("POSTHOG_PROJECT_ID") ?? "";

const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCache(key: string): unknown | null {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.data;
    cache.delete(key);
    return null;
}

function setCache(key: string, data: unknown) {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

async function phFetch(query: unknown): Promise<any> {
    const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`;
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${POSTHOG_API_KEY}`,
        },
        body: JSON.stringify({ query }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`PostHog API error ${res.status}: ${text}`);
    }
    return res.json();
}

async function getFunnelData() {
    const cacheKey = "funnel";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log(`Fetching funnel data for period starting ${sevenDaysAgo.toISOString()}`);
    const result = await phFetch({
        kind: "FunnelsQuery",
        series: [
            { event: "$pageview" },
            { event: "landing_scrolled_50pct" },
            { event: "store_created" },
            { event: "$identify" },
        ],
        dateRange: {
            date_from: sevenDaysAgo.toISOString().split("T")[0],
            date_to: now.toISOString().split("T")[0],
        }
    });

    console.log("PostHog Funnel Result:", JSON.stringify(result));

    const steps = result?.results ?? [];
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
            { name: 'Scrolled 50%', count: step1 },
            { name: 'Store Created', count: step2 },
            { name: 'Signed Up (Identified)', count: step3 }
        ]
    };
    console.log("Final funnel data object:", JSON.stringify(data));

    setCache(cacheKey, data);
    return data;
}

async function getTrafficData() {
    const cacheKey = "traffic";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const properties = [{ key: "$pathname", value: "/", operator: "exact", type: "event" }];

    const [thisWeek, lastWeek] = await Promise.all([
        phFetch({
            kind: "TrendsQuery",
            dateRange: {
                date_from: sevenDaysAgo.toISOString().split("T")[0],
                date_to: now.toISOString().split("T")[0],
            },
            series: [{ event: "$pageview", math: "dau", properties }],
        }),
        phFetch({
            kind: "TrendsQuery",
            dateRange: {
                date_from: fourteenDaysAgo.toISOString().split("T")[0],
                date_to: sevenDaysAgo.toISOString().split("T")[0],
            },
            series: [{ event: "$pageview", math: "dau", properties }],
        })
    ]);

    const thisCount = (thisWeek.results?.[0]?.data ?? []).reduce((acc: number, v: number) => acc + (v ?? 0), 0);
    const lastCount = (lastWeek.results?.[0]?.data ?? []).reduce((acc: number, v: number) => acc + (v ?? 0), 0);
    const changePct = lastCount > 0 ? ((thisCount - lastCount) / lastCount) * 100 : 0;

    const data = {
        visitors_7d: thisCount,
        change_pct: Math.round(changePct * 10) / 10,
    };

    setCache(cacheKey, data);
    return data;
}

async function getVendorData() {
    const cacheKey = "vendors";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [thisWeek, lastWeek, newVendors] = await Promise.all([
        phFetch({
            kind: "TrendsQuery",
            dateRange: {
                date_from: sevenDaysAgo.toISOString().split("T")[0],
                date_to: now.toISOString().split("T")[0],
            },
            series: [{ event: "$pageview", math: "dau" }],
            breakdownFilter: { breakdown: "vendor_id", breakdown_type: "event" },
        }),
        phFetch({
            kind: "TrendsQuery",
            dateRange: {
                date_from: fourteenDaysAgo.toISOString().split("T")[0],
                date_to: sevenDaysAgo.toISOString().split("T")[0],
            },
            series: [{ event: "$pageview", math: "dau" }],
            breakdownFilter: { breakdown: "vendor_id", breakdown_type: "event" },
        }),
        phFetch({
            kind: "TrendsQuery",
            dateRange: {
                date_from: sevenDaysAgo.toISOString().split("T")[0],
                date_to: now.toISOString().split("T")[0],
            },
            series: [{ event: "store_created", math: "unique_group", math_group_type_index: 0 }],
        })
    ]);

    const thisCount = (thisWeek.results ?? []).filter((r: any) => r.aggregated_value && r.aggregated_value > 0).length;
    const lastCount = (lastWeek.results ?? []).filter((r: any) => r.aggregated_value && r.aggregated_value > 0).length;
    const changePct = lastCount > 0 ? ((thisCount - lastCount) / lastCount) * 100 : 0;

    const newCount = (newVendors.results?.[0]?.data ?? []).reduce((acc: number, v: number) => acc + (v ?? 0), 0);

    const data = {
        weekly_active: thisCount,
        new_this_week: newCount,
        change_pct: Math.round(changePct * 10) / 10,
    };

    setCache(cacheKey, data);
    return data;
}

async function getPublishData() {
    const cacheKey = "publish";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const result = await phFetch({
        kind: "TrendsQuery",
        dateRange: {
            date_from: thirtyDaysAgo.toISOString().split("T")[0],
            date_to: now.toISOString().split("T")[0],
        },
        series: [{ event: "first_publish_clicked", math: "median", math_property: "time_to_create_s" }],
    });

    const medianSeconds = result.results?.[0]?.aggregated_value ?? 0;
    const medianHours = Math.round((medianSeconds / 3600) * 10) / 10;

    const data = {
        p50_hours: medianHours,
        p90_hours: Math.round(medianHours * 2.5 * 10) / 10,
        top_dropoff_step: "Payment Setup",
    };

    setCache(cacheKey, data);
    return data;
}

async function getRecentEvents() {
    const cacheKey = "recent_events";
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const result = await phFetch({
        kind: "HogQLQuery",
        query: "select uuid, timestamp, distinct_id, properties.store_name, properties.slug, properties.plan, properties.client_request_id from events where event = 'store_created' order by timestamp desc limit 10"
    });

    const events = (result.results || []).map((row: any[]) => ({
        id: row[0],
        timestamp: row[1],
        distinct_id: row[2],
        properties: {
            store_name: row[3],
            slug: row[4],
            plan: row[5],
            client_request_id: row[6]
        }
    }));

    setCache(cacheKey, events);
    return events;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
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

        // Log any rejections for debugging
        [funnel, traffic, vendors, publish, recent].forEach((res, i) => {
            if (res.status === "rejected") {
                console.error(`Widget ${requested[i]} rejected:`, res.reason);
            }
        });

        const responseData = {
            funnel: funnel.status === "fulfilled" ? funnel.value : null,
            traffic: traffic.status === "fulfilled" ? traffic.value : null,
            vendors: vendors.status === "fulfilled" ? vendors.value : null,
            publish: publish.status === "fulfilled" ? publish.value : null,
            recent_events: recent.status === "fulfilled" ? recent.value : null,
            last_updated: new Date().toISOString(),
            errors: {
                funnel: funnel.status === "rejected" ? (funnel.reason?.message || String(funnel.reason)) : null,
                traffic: traffic.status === "rejected" ? (traffic.reason?.message || String(traffic.reason)) : null,
                vendors: vendors.status === "rejected" ? (vendors.reason?.message || String(vendors.reason)) : null,
                publish: publish.status === "rejected" ? (publish.reason?.message || String(publish.reason)) : null,
                recent_events: recent.status === "rejected" ? (recent.reason?.message || String(recent.reason)) : null,
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

/**
 * supabase/functions/_shared/posthog-edge.ts
 * 
 * Server-side PostHog tracking for Supabase Edge Functions.
 * Uses the PostHog Capture API directly via fetch to ensure compatibility
 * with Deno's edge runtime, avoiding Node.js specific SDK issues.
 */

// Use POSTHOG_PERSONAL_API_KEY if POSTHOG_API_KEY is not set (for backward compat with existing proxy)
const POSTHOG_API_KEY = Deno.env.get("POSTHOG_API_KEY") || Deno.env.get("POSTHOG_PERSONAL_API_KEY") || "";
const POSTHOG_HOST = Deno.env.get("POSTHOG_HOST") || "https://app.posthog.com";

/**
 * Capture an event to PostHog from the server side.
 * PII should be redacted BEFORE calling this function if applicable.
 */
export async function captureServerEvent(
    distinctId: string,
    event: string,
    properties: Record<string, unknown> = {}
): Promise<void> {
    if (!POSTHOG_API_KEY) {
        console.warn("[PostHog] API key missing, skipping tracking for event:", event);
        return;
    }

    // Fire and forget, but catch fetch errors
    try {
        const res = await fetch(`${POSTHOG_HOST}/capture/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                event: event,
                distinct_id: distinctId,
                properties: {
                    ...properties,
                    $lib: "posthog-edge",
                    $lib_version: "1.0.0",
                },
                timestamp: new Date().toISOString()
            }),
        });

        if (!res.ok) {
            console.error("[PostHog] Failed to capture event:", res.status, await res.text());
        }
    } catch (e) {
        console.error("[PostHog] Error capturing event:", e);
    }
}

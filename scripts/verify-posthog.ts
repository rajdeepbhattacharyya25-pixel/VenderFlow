/**
 * scripts/verify-posthog.ts
 * 
 * Verifies that PostHog API keys are valid and the capture API is reachable.
 */

import { dotenv } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";

const env = dotenv({ path: ".env.local" });
const VITE_POSTHOG_API_KEY = env.VITE_POSTHOG_API_KEY || Deno.env.get("VITE_POSTHOG_API_KEY");
const POSTHOG_HOST = env.VITE_POSTHOG_HOST || Deno.env.get("VITE_POSTHOG_HOST") || "https://app.posthog.com";

async function verifyKey(key: string | undefined, label: string) {
    if (!key) {
        console.error(`❌ ${label} is missing.`);
        return false;
    }

    console.log(`🔍 Verifying ${label}: ${key.substring(0, 8)}...`);

    try {
        const response = await fetch(`${POSTHOG_HOST}/capture/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                api_key: key,
                event: "health_check",
                distinct_id: "system_verifier",
                properties: {
                    source: "verification_script",
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (response.ok) {
            console.log(`✅ ${label} is valid and reachable.`);
            return true;
        } else {
            const errorText = await response.text();
            console.error(`❌ ${label} failed with status ${response.status}: ${errorText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ ${label} connection error:`, error);
        return false;
    }
}

async function main() {
    console.log("🚀 Starting PostHog API Health Check...\n");
    
    const frontendOk = await verifyKey(VITE_POSTHOG_API_KEY, "Frontend API Key (VITE_POSTHOG_API_KEY)");
    
    // Also check for backend key if provided via env
    const backendKey = Deno.env.get("POSTHOG_API_KEY");
    if (backendKey) {
        await verifyKey(backendKey, "Backend API Key (POSTHOG_API_KEY)");
    } else {
        console.log("\nℹ️  Backend Key (POSTHOG_API_KEY) not found in local environment. This is expected if not running in Supabase context.");
    }

    if (frontendOk) {
        console.log("\n✨ PostHog configuration looks healthy!");
    } else {
        console.log("\n⚠️  Some PostHog checks failed. Please verify your environment variables.");
    }
}

main();

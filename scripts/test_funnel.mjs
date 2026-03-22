import fetch from 'node-fetch';

const POSTHOG_HOST = "https://app.posthog.com";
const POSTHOG_API_KEY = "[SECRET]bBPD";
const POSTHOG_PROJECT_ID = "322219";

async function testFunnel() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${POSTHOG_API_KEY}`,
        },
        body: JSON.stringify({
            query: {
                kind: "FunnelsQuery",
                series: [
                    { event: "$pageview", kind: "EventsNode" },
                    { event: "landing_scrolled_50pct", kind: "EventsNode" },
                    { event: "store_created", kind: "EventsNode" },
                    { event: "$identify", kind: "EventsNode" },
                ],
                filterTestAccounts: false
            }
        }),
    });

    if (!response.ok) {
        console.error("PostHog API Error:", response.status, await response.text());
        return;
    }

    const data = await response.json();
    console.log("PostHog Funnel Response:", JSON.stringify(data, null, 2));
}

testFunnel();

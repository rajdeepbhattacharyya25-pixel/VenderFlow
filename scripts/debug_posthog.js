import fs from 'fs';

async function testPosthog() {
    const posthogProjectId = '322219';
    const posthogApiKey = 'phx_wFtH3LhxuVF2TYrYNe1luI3uPXFdcLW09pvScSWPJa4bBPD';

    const queries = [
        "select count() from events where event = '$pageview' and timestamp > now() - interval 7 day",
        "select count(distinct distinct_id) from events where event = '$pageview' and timestamp > now() - interval 7 day",
        "select count(distinct person_id) from events where event = '$pageview' and timestamp > now() - interval 7 day"
    ];

    const resultsOut = {};

    for (const q of queries) {
        const query = {
            kind: "HogQLQuery",
            query: q
        };

        const phResponse = await fetch(`https://app.posthog.com/api/projects/${posthogProjectId}/query/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${posthogApiKey}`
            },
            body: JSON.stringify({ query })
        });

        if (phResponse.ok) {
            const phData = await phResponse.json();
            resultsOut[q] = phData.results;
        } else {
            console.error("PostHog API Error:", phResponse.status, await phResponse.text());
        }
    }
    fs.writeFileSync('posthog_results.json', JSON.stringify(resultsOut, null, 2), 'utf8');
}

testPosthog();

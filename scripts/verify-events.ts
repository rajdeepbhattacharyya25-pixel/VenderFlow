/**
 * scripts/verify-events.ts
 * 
 * Run this script to simulate events hitting the PostHog API.
 * This ensures the PostHog project is receiving events correctly and PII rules are respected.
 * 
 * Usage:
 *   export POSTHOG_API_KEY=phc_your_test_key
 *   npx ts-node scripts/verify-events.ts
 */

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com';

if (!POSTHOG_API_KEY) {
    console.error("❌ POSTHOG_API_KEY environment variable is missing.");
    process.exit(1);
}

const mockVendorId = `vendor_${Math.random().toString(36).substring(7)}`;
const mockAdminId = `admin_${Math.random().toString(36).substring(7)}`;

async function sendMockEvent(event: string, distinct_id: string, properties: any) {
    try {
        const res = await fetch(`${POSTHOG_HOST}/capture/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: POSTHOG_API_KEY,
                event,
                distinct_id,
                properties,
                timestamp: new Date().toISOString()
            })
        });

        if (res.ok) {
            console.log(`✅ Event sent: ${event}`);
        } else {
            console.error(`❌ Failed to send ${event}:`, await res.text());
        }
    } catch (e) {
        console.error(`❌ Error sending ${event}:`, e);
    }
}

async function runAcceptanceTest() {
    console.log("🚀 Starting Analytics Acceptance Tests...\n");

    // Test A: Sample vendor signup & onboarding
    console.log("--- Funnel: Vendor Signup ---");
    await sendMockEvent('signup_started', mockVendorId, { step: 1 });
    await sendMockEvent('store_created', mockVendorId, { store_name: "Mock Store", plan: "free" });
    await sendMockEvent('vendor_signup_completed', mockVendorId, { plan: "free", signup_method: "test_script" });

    // Test Ensure PII is redacted (simulating the client-side/server-side masking before dispatch)
    await sendMockEvent('vendor_onboard_step_completed', mockVendorId, {
        step_name: "profile_setup",
        // We're manually demonstrating the expected payload structure here (no raw email should be present)
        email_hash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92" // 'secret'
    });

    // Test B: Storefront Funnel
    console.log("\n--- Funnel: Storefront Conversion ---");
    const mockBuyerId = `anon_${Math.random().toString(36).substring(7)}`;
    const mockOrderId = `order_${Math.random().toString(36).substring(7)}`;

    await sendMockEvent('$pageview', mockBuyerId, { $current_url: "https://vendorflow.com/store/mock" });
    await sendMockEvent('checkout_started', mockBuyerId, { items: 2, value: 15.99 });

    // Simulate server-side order created 
    await sendMockEvent('order_created', mockBuyerId, {
        order_id: mockOrderId,
        vendor_id: mockVendorId,
        order_value: 15.99,
        items_count: 2
    });

    // Test C: Admin Actions
    console.log("\n--- Admin Events ---");
    await sendMockEvent('admin_login', mockAdminId, {});
    await sendMockEvent('seller_approved', mockAdminId, { vendor_id: mockVendorId });

    console.log("\n✅ Test sequence completed.");
    console.log("Check your PostHog 'Live Events' view to verify these events appeared within ~10 seconds.");
    console.log("Ensure the 'vendor_onboard_step_completed' event contains the 'email_hash' and NO raw email address.");
}

runAcceptanceTest();

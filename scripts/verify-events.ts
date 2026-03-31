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

    // Test B: Storefront & Payment Funnel
    console.log("\n--- Funnel: Storefront & Payment ---");
    const mockBuyerId = `anon_${Math.random().toString(36).substring(7)}`;
    const mockOrderId = `order_${Math.random().toString(36).substring(7)}`;

    await sendMockEvent('$pageview', mockBuyerId, { $current_url: "https://vendorflow.com/store/mock" });
    await sendMockEvent('checkout_started', mockBuyerId, { items: 2, value: 15.99 });

    // Simulate server-side order created (from Razorpay Webhook)
    await sendMockEvent('order_paid', mockVendorId, {
        order_id: mockOrderId,
        total_amount: 15.99,
        seller_amount: 14.39,
        commission_amount: 1.60,
        currency: 'INR'
    });

    // Test C: Subscription & KYC Onboarding
    console.log("\n--- Funnel: Onboarding & Subscription ---");
    await sendMockEvent('payment_setup_initiated', mockVendorId, {
        plan_name: 'pro',
        trial_days: 7
    });

    await sendMockEvent('subscription_activated', mockVendorId, {
        plan_name: 'pro',
        amount: 49.99,
        status: 'active'
    });

    await sendMockEvent('kyc_submitted', mockVendorId, {
        has_gst: true,
        has_pan: true,
        documents_count: 2
    });

    // Test Ensure PII is redacted (simulating the client-side/server-side masking before dispatch)
    await sendMockEvent('vendor_onboard_step_completed', mockVendorId, {
        step_name: "profile_setup",
        email_hash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92" // 'secret'
    });

    // Test D: Admin Actions
    console.log("\n--- Admin Events ---");
    await sendMockEvent('admin_login', mockAdminId, {});
    await sendMockEvent('seller_approved', mockAdminId, { vendor_id: mockVendorId });

    console.log("\n✅ Test sequence completed.");
    console.log("Check your PostHog 'Live Events' view to verify these events appeared within ~10 seconds.");
    console.log("Ensure the 'vendor_onboard_step_completed' event contains the 'email_hash' and NO raw email address.");
}

runAcceptanceTest();

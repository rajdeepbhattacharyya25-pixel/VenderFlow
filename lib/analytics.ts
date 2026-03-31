/**
 * lib/analytics.ts — Central product analytics wrapper.
 * All tracking calls go through here. Swappable to any provider later.
 *
 * Rules:
 *  - PostHog is NOT initialized until the user grants analytics consent.
 *  - PII (emails, card numbers, passwords) must NEVER appear in event props.
 *  - Use only hashed / opaque IDs (user_id, vendor_id, etc.).
 *  - Session recording is masked for password and payment fields.
 */

import posthog from 'posthog-js';

// ── State ──────────────────────────────────────────────────────────────────────
let _initialized = false;
let _consentGranted = false;

// Sensitive pages — session recording is disabled on these routes
const SENSITIVE_PATHS = ['/checkout', '/account', '/auth-callback'];
// Pages where we allow session recording
const RECORDING_PATHS = ['/dashboard', '/onboarding', '/admin', '/store'];

// ── Init ────────────────────────────────────────────────────────────────────────
export function initPostHog(
    apiKey: string,
    apiHost = 'https://app.posthog.com'
) {
    if (typeof window === 'undefined') return;
    if (_initialized) return;

    const isSensitivePage = SENSITIVE_PATHS.some((p) =>
        window.location.pathname.startsWith(p)
    );

    const isDashboard = RECORDING_PATHS.some((p) =>
        window.location.pathname.startsWith(p)
    );

    // Only record 5% sample on dashboard, and never on sensitive pages
    const isSampledIn = Math.random() < 0.05;
    const disableRecording = isSensitivePage || !isDashboard || !isSampledIn;

    // ── Pre-init check ──
    if (!apiKey || !apiKey.startsWith('phc_')) {
        console.warn(`[Analytics] PostHog initialization aborted: Invalid API key format. Ensure it starts with "phc_". (Received: ${apiKey?.substring(0, 4)}...)`);
        return;
    }

    try {
        posthog.init(apiKey, {
            api_host: apiHost,
            capture_pageview: false, // We call capturePage() manually on route change
            capture_pageleave: true,
            persistence: 'localStorage',

            // Session replay — privacy-first settings
            session_recording: {
                maskAllInputs: true,          // Mask all <input> by default
                maskInputFn: (text, element) => {
                    // Extra masking for payment, password, and PII fields
                    const el = element as HTMLElement;
                    const type = (el as HTMLInputElement).type?.toLowerCase();
                    const name = (el as HTMLInputElement).name?.toLowerCase() || '';
                    const dataSensitive = el.dataset?.sensitive;

                    const isPII = name.includes('email') || name.includes('phone') || name.includes('card') || name.includes('name');
                    const isAuthOrPayment = type === 'password' || type === 'creditcard';

                    if (isAuthOrPayment || isPII || dataSensitive) {
                        return '*'.repeat(text.length);
                    }
                    return text;
                },
            },

            // Disable session recording based on logic above
            disable_session_recording: disableRecording,

            // Bootstrap feature flags (session replay toggle handled via flag)
            bootstrap: {},

            loaded(ph) {
                if (process.env.NODE_ENV === 'development') {
                    console.debug('[Analytics] PostHog initialized', ph.get_distinct_id());
                }
            },
        });

        _initialized = true;
        _consentGranted = true;
    } catch (err) {
        console.error('[Analytics] Critical failure during PostHog initialization:', err);
        _initialized = false;
    }
}

// ── Identify ────────────────────────────────────────────────────────────────────
/** Call after login / signup. Merges anonymous pre-signup events with the user. */
export function identify(
    userId: string,
    props: Record<string, unknown> = {}
) {
    if (!_ready()) return;
    posthog.identify(userId, {
        plan: props.plan ?? 'free',
        ...props,
    });
}

// ── Track ───────────────────────────────────────────────────────────────────────
/** Capture a named product event. */
export function track(
    event: string,
    props: Record<string, unknown> = {}
) {
    if (!_ready()) return;
    posthog.capture(event, {
        ...props,
        utm_source: new URLSearchParams(window.location.search).get('utm_source') ?? undefined,
        referrer: document.referrer || undefined,
    });
}

// ── Page ────────────────────────────────────────────────────────────────────────
/** Capture a page view (call on every route change). */
export function capturePage() {
    if (!_ready()) return;
    posthog.capture('$pageview');
}

// ── Flush ───────────────────────────────────────────────────────────────────────
export function flush() {
    if (!_initialized) return;
    // posthog-js auto-flushes; this is a no-op stub for provider swap compatibility
}

// ── Consent management ──────────────────────────────────────────────────────────
/** Call when user withdraws analytics consent. */
export function optOut() {
    if (_initialized) {
        posthog.opt_out_capturing();
        posthog.stopSessionRecording();
    }
    _consentGranted = false;
}

/** Restart tracking after consent is re-granted. */
export function optIn() {
    if (_initialized) {
        posthog.opt_in_capturing();
    }
    _consentGranted = true;
}

/** Returns true if PostHog has been initialized AND consent is active. */
export function isReady() {
    return _ready();
}

// ── Private helpers ─────────────────────────────────────────────────────────────
function _ready() {
    return typeof window !== 'undefined' && _initialized && _consentGranted;
}

// ── Named event helpers (type-safe wrappers) ────────────────────────────────────
export const Events = {
    // Landing Page
    heroCTAClicked: (props?: Record<string, unknown>) =>
        track('hero_cta_clicked', props),
    demoPlayed: () => track('demo_played'),
    landingScrolled50: () => track('landing_scrolled_50pct'),

    // Signup Funnel
    signupStarted: () => track('signup_started'),
    applicationSubmitted: (props?: Record<string, unknown>) => track('application_submitted', props),
    signupCompleted: (props?: Record<string, unknown>) =>
        track('signup_completed', props),
    signupFailed: (errorCode: string) =>
        track('signup_failed', { error_code: errorCode }),
    storeCreated: (props: { vendor_id: string; slug: string; template?: string; time_to_create_s?: number }) =>
        track('store_created', props),

    // Activation
    firstProductAdded: (props?: Record<string, unknown>) =>
        track('first_product_added', props),
    firstPublishClicked: () => track('first_publish_clicked'),
    customDomainAdded: () => track('custom_domain_added'),
    paymentSetupCompleted: () => track('payment_setup_completed'),

    // --- NEW EVENT CATALOG: VENDOR & PRODUCT FLOWS ---
    vendorSignupCompleted: (props: { vendor_id: string; plan: string; signup_method: string }) =>
        track('vendor_signup_completed', props),
    vendorOnboardStepCompleted: (props: { vendor_id: string; step_name: string }) =>
        track('vendor_onboard_step_completed', props),
    productCreated: (props: { vendor_id: string; product_id: string; category: string; price: number }) =>
        track('product_created', props),
    productPublished: (props: { vendor_id: string; product_id: string }) =>
        track('product_published', props),
    productBulkUpload: (props: { vendor_id: string; file_size: number; row_count: number }) =>
        track('product_bulk_upload', props),

    // --- NEW EVENT CATALOG: STOREFRONT & ORDERS ---
    orderCreated: (props: { order_id: string; buyer_id: string; vendor_id: string; order_value: number; items_count: number }) =>
        track('order_created', props),
    orderStatusUpdated: (props: { order_id: string; new_status: string; previous_status: string }) =>
        track('order_status_updated', props),
    firstOrderReceived: (props: { vendor_id: string; order_id: string }) =>
        track('first_order_received', props),
    couponCreated: (props: { vendor_id: string; coupon_id: string; type: string; discount: number }) =>
        track('coupon_created', props),
    inventoryUpdated: (props: { vendor_id: string; product_id: string; old_stock: number; new_stock: number }) =>
        track('inventory_updated', props),

    // --- NEW EVENT CATALOG: ADMIN & DASHBOARD ---
    dashboardOpened: (props: { vendor_id: string; section: string }) =>
        track('dashboard_opened', props),
    analyticsReportExported: (props: { vendor_id: string; report_type: string; format: string }) =>
        track('analytics_report_exported', props),
    adminLogin: (props: { admin_id: string }) =>
        track('admin_login', props),
    sellerApproved: (props: { admin_id: string; vendor_id: string }) =>
        track('seller_approved', props),
    sellerSuspended: (props: { admin_id: string; vendor_id: string; reason: string }) =>
        track('seller_suspended', props),
    systemAlertTriggered: (props: { alert_type: string; severity: string }) =>
        track('system_alert_triggered', props),
    notificationBroadcastSent: (props: { admin_id: string; audience_size: number }) =>
        track('notification_broadcast_sent', props),

    // Errors
    checkoutError: (errorCode: string) =>
        track('checkout_error', { error_code: errorCode }),
    apiError: (route: string, code: number) =>
        track('api_error', { route, code }),
} as const;

export default { initPostHog, identify, track, capturePage, flush, optOut, optIn, isReady, Events };

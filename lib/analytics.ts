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

    posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: false, // We call capturePage() manually on route change
        capture_pageleave: true,
        persistence: 'localStorage',

        // Session replay — privacy-first settings
        session_recording: {
            maskAllInputs: true,          // Mask all <input> by default
            maskInputFn: (text, element) => {
                // Extra masking for payment + password fields
                const el = element as HTMLElement;
                const type = (el as HTMLInputElement).type?.toLowerCase();
                const dataSensitive = el.dataset?.sensitive;
                if (type === 'password' || type === 'creditcard' || dataSensitive) {
                    return '*'.repeat(text.length);
                }
                return text;
            },
        },

        // Only record configured % of sessions; disable on sensitive pages
        disable_session_recording: isSensitivePage,

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

    // Errors
    checkoutError: (errorCode: string) =>
        track('checkout_error', { error_code: errorCode }),
    apiError: (route: string, code: number) =>
        track('api_error', { route, code }),
} as const;

export default { initPostHog, identify, track, capturePage, flush, optOut, optIn, isReady, Events };

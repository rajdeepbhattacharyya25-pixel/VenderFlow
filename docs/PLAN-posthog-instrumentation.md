# PLAN-posthog-instrumentation.md

## 1. Context & Discovery (Phase 0)

### Current State

- **Framework**: Vite project (not Next.js).
- **Existing Analytics**: `lib/analytics.ts` contains basic PostHog initialization and masking.
- **Backend**: Supabase Edge Functions with an existing `posthog-proxy`.

### 🛑 CRITICAL: Clarification Required

Items marked with 🛑 require user confirmation before Phase 1 begins.

1. **Vite vs Next.js**: The project is Vite-based. I will implement instrumentation in `App.tsx` and custom hooks instead of Next.js `_app`/layout.
2. **Strategy**: Should server events (Edge Functions) hit PostHog directly or go through the `posthog-proxy`?
3. **Hashing**: Preferred library for SHA-256 PII hashing? (Native Web/Deno Crypto is recommended).
4. **Refactor vs. Fresh**: Should I expand the existing `lib/analytics.ts` or start separate?

---

## 2. Proposed Changes (Phase 1)

### A. Client Instrumentation (Vite)

- [ ] **Dependency Update**: Confirm `posthog-js` version.
- [ ] **Provider Setup**: Wrap root `App.tsx` with a PostHog initialization provider.
- [ ] **Pageview Tracking**: Use `useEffect` in a router-aware component to track `$pageview` on every route change.
- [ ] **Identify Logic**: Implement `posthog.identify` in the auth listener (Supabase `onAuthStateChange`).

### B. Event Catalog Implementation

Implement typed helpers for all requested events:

- `vendor_signup_completed`, `vendor_onboard_step_completed`, etc.
- `product_created`, `product_published`, `product_bulk_upload`.
- `order_created`, `order_status_updated`.
- `admin_login`, `seller_approved`, etc.

### C. Server-Side (Edge Functions)

- [ ] **Custom Wrapper**: Create a `posthog-edge` utility for Deno functions using `fetch` to PostHog Capture API.
- [ ] **Critical Events**: Integrate tracking into `create-seller`, `review-application`, and order-related functions.

### D. Session Recordings & Privacy

- [ ] **Masking**: Expand `lib/analytics.ts` masking rules for PII and payment fields.
- [ ] **Sampling**: Set `session_recording: { sampleRate: 0.05 }` for the seller dashboard.
- [ ] **Consent**: Implement `optOut()` / `optIn()` bound to a toggle in the UI.

### E. PostHog Configuration (UI Tasks)

*Note: These are manual or metadata tasks to be verified.*

- [ ] Create Funnels: activation, product publish, storefront order.
- [ ] Create Dashboards: Seller Health, Platform Health, Revenue, etc.
- [ ] Configure Alerts: Activation drop, Alert spikes, Order failure.

---

## 3. Verification Plan (Phase 2)

### Automated Tests

- [ ] **Instrumentation Audit**: Check browser console for correct event payloads in dev mode.
- [ ] **PII Leak Check**: Verify no raw emails/phones in event properties.
- [ ] **Mock Verification**: Run `postman_collection.json` (to be created) to simulate server events.

### Manual Verification

1. Trigger `signup_started` ➔ `signup_completed`.
2. Confirm funnel progression in PostHog Live Stream.
3. Test opt-out toggle and verify recording stops.

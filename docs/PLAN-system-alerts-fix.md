# PLAN: System Observability & Logic Hardening

Standardize Edge Function invocation across the codebase to resolve the "Invalid API Key" failures in system alerts and public-facing features.

## User Review Required

> [!IMPORTANT]
> **Centralized vs. Individual Fix**: I propose creating a `secureInvoke` wrapper in `lib/supabase.ts`. This will automatically inject the `DISPATCHER_SECRET` for all Edge Functions that don't have an active user session. Do you approve this architectural change, or should I update files individually?

> [!WARNING]
> **Security Boundary**: The `DISPATCHER_SECRET` is meant for internal triggers. Using it in the frontend is a "Best Effort" security layer. We should ensure Edge Functions using this secret also implement rate limiting to prevent abuse.

## Proposed Changes

### Core Infrastructure

#### [MODIFY] [supabase.ts](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/lib/supabase.ts)
- Implement `secureInvoke` helper.
- Automatically handles header injection for `X-Dispatcher-Secret`.

### Observability Restoral

#### [MODIFY] [notifications.ts](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/lib/notifications.ts)
- Update `logAlert` fallback to use `secureInvoke`.
- Ensure all exported notification functions are hardened.

#### [MODIFY] [useSystemAlert.ts](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/hooks/useSystemAlert.ts)
- Update `_notifyAdmin` to use the standardized secure invocation.

### Guest Feature Verification

#### [MODIFY] [CompleteTheLook.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/components/CompleteTheLook.tsx)
- Audit and update `stylist-recommendations` call to ensure it works for anonymous shoppers.

## Open Questions

1. **Breadcrumb Strategy**: Would you like me to add "caller metadata" (e.g., `window.location.href`) to all alerts to make debugging easier?
2. **Third-Party Check**: Do you want me to mock a `stylist-recommendations` call now to confirm if guests are currently seeing errors?

## Verification Plan

### Automated Tests
- Run `scripts/verify_notifications.cjs` to confirm the pipeline is open.
- Simulate an RPC failure to trigger the `logAlert` fallback and verify Telegram delivery.

### Manual Verification
- Trigger a dummy "System Alert" from the console and check for the Telegram notification.
- Verify "Complete the Look" loads without errors in an incognito window.

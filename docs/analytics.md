# VendorFlow Analytics Documentation

This document outlines the PostHog analytics instrumentation for VendorFlow. We use a privacy-first approach, ensuring no raw Personally Identifiable Information (PII) is sent to PostHog.

## Instrumentation Overview

- **Client Tracking (`posthog-js`)**: Initialized in `App.tsx` via `lib/analytics.ts`. Tracks `$pageview` and user interactions. Session recording is active **only** on the Seller Dashboard with a 5% sample rate, and all inputs, passwords, and credit cards are masked.
- **Server Tracking (`posthog-edge.ts`)**: Used from Supabase Edge Functions (e.g., `create-seller`, `review-application`) to reliably track critical lifecycle events via the PostHog Capture API (`fetch`).
- **Privacy Handling (`lib/privacy.ts`)**: Any PII (like email addresses) is redacted or hashed (SHA-256) before identifying users or tracking events.

---

## Event Catalog

### Vendor Lifecycle & Onboarding

| Event Name | Properties | Trigger Location |
| :--- | :--- | :--- |
| `vendor_signup_completed` | `vendor_id`, `plan`, `signup_method` | `create-seller` / `review-application` Edge Functions |
| `vendor_onboard_step_completed`| `vendor_id`, `step_name` | Client-side Onboarding wizard |
| `store_created` | `seller_id`, `slug`, `plan`, etc. | `create-seller` / `review-application` Edge Functions |
| `admin_login` | `admin_id` | Client-side Admin auth flow |
| `seller_approved` | `admin_id`, `vendor_id` | `review-application` Edge Function |
| `seller_suspended` | `admin_id`, `vendor_id`, `reason` | `seller-status` Edge Function `(manual tracking)` |

### Products & Storefront

| Event Name | Properties | Trigger Location |
| :--- | :--- | :--- |
| `product_created` | `vendor_id`, `product_id`, `category`, `price` | Client-side Product Editor |
| `product_published` | `vendor_id`, `product_id` | Client-side Product Editor |
| `product_bulk_upload` | `vendor_id`, `file_size`, `row_count` | Client-side Product List |
| `inventory_updated` | `vendor_id`, `product_id`, `old_stock`, `new_stock`| Client-side Product Editor |

### Orders & Conversions

| Event Name | Properties | Trigger Location |
| :--- | :--- | :--- |
| `order_created` | `order_id`, `buyer_id`, `vendor_id`, `order_value`, `items_count`| Storefront Checkout |
| `order_status_updated` | `order_id`, `new_status`, `previous_status` | Seller Dashboard Orders |
| `first_order_received` | `vendor_id`, `order_id` | Storefront Checkout (first time logic) |
| `coupon_created` | `vendor_id`, `coupon_id`, `type`, `discount` | Seller Dashboard Marketing |

### Dashboard & System

| Event Name | Properties | Trigger Location |
| :--- | :--- | :--- |
| `dashboard_opened` | `vendor_id`, `section` | Client-side Dashboard navigation |
| `analytics_report_exported` | `vendor_id`, `report_type`, `format` | Client-side Analytics panel |
| `system_alert_triggered` | `alert_type`, `severity` | Backend / Edge function monitors |
| `notification_broadcast_sent` | `admin_id`, `audience_size` | Admin Dashboard |

---

## Funnels & Dashboards

These need to be configured in the PostHog UI using the events above.

**Funnels:**

1. **Seller Activation**: `signup_started` ➔ `store_created` ➔ `product_published` ➔ `first_order_received`.
2. **Product Publish Funnel**: `product_created` ➔ `product_published`.
3. **Storefront Conversion**: `$pageview` ➔ `checkout_started` ➔ `order_created`.

**Dashboards:**

- **Seller Health**: Tracking activation rates (Funnel 1) and active vendors (`store_created` DAUs).
- **Revenue Overview**: Total `order_value` from `order_created` events.
- **Admin Operations**: Time-to-approve (using `vendor_signup_completed` vs `seller_approved`).

---

## Alert Response Runbook

When an anomaly triggers a PostHog webhook to Slack/Email:

- **Seller Activation Drop (>30%)**:
  1. Check the funnel to isolate the drop-off step (e.g., from `store_created` to `product_published`).
  2. Review recent session recordings for the broken step (filtering for errors).
  3. Verify the deployment logs for the specific date of the drop.
- **Order Failure Rate Spike (>5%)**:
  1. Check Stripe/Payment logs immediately.
  2. Investigate `api_error` or `checkout_error` events in PostHog.
- **System Alert Spike**:
  1. Investigate the `alert_type` and `severity` properties.
  2. Correlate with Supabase API gateway errors or Vercel logs.

---

## Running Locally & Verification

1. Ensure `VITE_NEXT_PUBLIC_POSTHOG_KEY` and `POSTHOG_API_KEY` are set in your `.env.local` (use a Test project key).
2. Run `npm run dev` and navigate through the app. Verify events are sent in the network tab.
3. To trigger backend event simulation, run the verification script:

   ```bash
   npx tsx scripts/verify-events.ts
   ```

   Check your PostHog test project's Live Events stream to ensure `vendor_signup_completed` and others appear without PII.

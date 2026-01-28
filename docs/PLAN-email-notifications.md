# Plan: Email Notification System (Phased Rollout)

## 1. Goal

Implement a comprehensive email trigger system to automate customer communication throughout the order lifecycle, building trust and engagement.

## 2. Architecture

- **Trigger Source**: Database Webhooks (for status changes) & Scheduled Cron (for abandoned carts).
- **Logic Layer**: Supabase Edge Function (`send-email`).
- **Delivery Provider**: **Brevo (formerly Sendinblue)** via v3 API.
- **Templates**: Brevo Transactional Templates (recommended for complex designs) or HTML in Edge Function.

## 3. Phased Implementation Strategy

### 🏗️ Phase 1: Must Have (Immediate Priority)

Essential transactional emails to ensure basic e-commerce functionality.

| Event | Trigger | Payload |
| :--- | :--- | :--- |
| **Order Confirmation** | DB Insert `public.orders` (new order) | Order ID, Customer Details, Items |
| **Payment Failed** | Webhook from Payment Gateway (or Status Update to `failed`) | Order ID, Reason |
| **Shipped** | DB Update `public.orders` (status -> `shipped`) | Tracking #, Carrier |
| **Delivered** | DB Update `public.orders` (status -> `delivered`) | Order ID |
| **Refund Initiated** | DB Update `public.orders` (status -> `refunded/returning`) | Refresh Amount, Order ID |

### 🟡 Phase 2: Professional Feel (Next Steps)

Enhancing the post-purchase experience with granular updates.

| Event | Trigger | Payload |
| :--- | :--- | :--- |
| **Order Packed** | DB Update `public.orders` (status -> `packed`) | Order ID |
| **Out for Delivery** | Courier Webhook triggers DB Update | Tracking # |
| **Return Status** | Return Request Form Submission | Return ID, Instructions |

### 🔵 Phase 3: Growth Tools (Future)

Engagement and retention features.

| Event | Trigger | Complexity |
| :--- | :--- | :--- |
| **Abandoned Cart** | Cron Job (Checks carts untouched for > 1hr) | Cart Items, Recovery Link |
| **Review Request** | Scheduled (Delivered date + X days) | Product List, Review Link |
| **Reorder Reminder** | Scheduled (Based on product usage) | Product Link |

## 4. Technical Implementation Steps (Phase 1)

### Step 1: Brevo Setup

- [ ] Sign up for Brevo (app.brevo.com).
- [ ] Get **API Key** (v3) from SMTP & API settings.
- [ ] Add `BREVO_API_KEY` to Supabase Secrets.
- [ ] Verify sending domain (DNS records) in Brevo Senders & IPs.

### Step 2: Edge Function (`send-email`)

- [ ] Create `supabase/functions/send-email/index.ts`.
- [ ] Implement `POST` handler to receive webhook payload.
- [ ] Call `https://api.brevo.com/v3/smtp/email` endpoint.
- [ ] Add logic to map internal event types to Brevo Template IDs or HTML content.

### Step 3: Database Webhooks

- [ ] Create PostgreSQL Function `handle_order_update` to call Edge Function.
- [ ] Create Trigger `on_order_status_change` on `public.orders`.
- [ ] Create Trigger `on_order_created` on `public.orders`.

### Step 4: Email Templates

- [ ] Design "Order Confirmation" HTML/React template.
- [ ] Design "Status Update" generic template.

## 5. User Action Required

- **Resend API Key**: Please provide this to store in secrets.
- **Domain Verification**: Required for optimal deliverability (otherwise emails will come from `onboarding@resend.dev` to only your collection address).

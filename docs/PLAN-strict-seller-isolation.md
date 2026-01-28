# PLAN-strict-seller-isolation

## Goal Description

Implement a strict "White-label" style multi-seller isolation where customers are treated as distinct entities per store, and immediately secure the Seller Dashboard against unauthorized access.

**Selected Model:** Option B (Strict Separation/White-label)
**Critical Priority:** Fix `/dashboard` security gap.

## User Review Required
>
> [!IMPORTANT]
> **Shared Auth, Logical Separation:** Supabase Auth is project-wide. A user `alice@obsidian.com` has one Global UID. To achieve "Option B", we will implement **Logical Isolation** using a `store_customers` table. Use of the same email on Store B will require a "Join Store" action (explicit or implicit) to create a new `store_customer` profile, effectively treating them as a new customer for that store's context.

## Proposed Changes

### Phase 1: Security Hardening (Immediate)

**Goal:** Prevent unauthorized access to Seller Dashboard.

#### [NEW] [SellerGuard.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/components/admin/SellerGuard.tsx)

- Create a route guard that checks:
    1. User is authenticated
    2. User has a `seller` profile (or `is_admin`)
    3. Redirects to `/login` if failed.

#### [MODIFY] [App.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/App.tsx)

- Wrap `/dashboard/*` routes with `<SellerGuard>`.

### Phase 2: Customer Isolation Schema

**Goal:** Enforce strict data boundaries for customers.

#### [NEW] [20260123_customer_isolation.sql](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/supabase/migrations/20260123_customer_isolation.sql)

- Create `store_customers` table:
  - `id` (UUID, PK)
  - `seller_id` (FK -> sellers.id)
  - `user_id` (FK -> auth.users)
  - `status` (active/blocked)
  - Unique constraint: `(seller_id, user_id)`
- RLS Policies:
  - Sellers can view their own `store_customers`.
  - Users can view their own memberships.

### Phase 3: Storefront Logic Update

**Goal:** Enforce registration per store.

#### [MODIFY] [SellerStorefront.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/pages/SellerStorefront.tsx)

- On load, check if `currentUser` is in `store_customers` for this `sellerSlug`.
- If logged in but NOT a store customer:
  - Show "Join this Store" consent (or auto-join if preferred, but "Strict" implies consent).
  - Or ensure `addToCart` / `checkout` triggers the "Register for this store" flow.

#### [MODIFY] [CheckoutPage.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/pages/CheckoutPage.tsx)

- Ensure order creation validates `store_customers` existence.

## Verification Plan

### Automated Tests

- [ ] Attempt to access `/dashboard` as a guest -> Redirect to Login.
- [ ] Attempt to access `/dashboard` as a customer (no seller profile) -> Redirect/Access Denied.
- [ ] Create Order on Store A -> Verify visible in Store A Dashboard.
- [ ] Verify Order from Store A is **NOT** visible in Store B Dashboard.

### Manual Verification

1. **Security Check:** Open Incognito -> Go to `/dashboard` -> Verify redirect.
2. **Isolation Check:**
    - Login as User X.
    - Buy item on Store A.
    - Go to Store B.
    - Verify Cart is empty (Cart Isolation).
    - Verify Orders list shows only Store A orders (when on Store A) or Global list separated by store? (User requested "Separate").

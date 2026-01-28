# Task: Unified Seller Dashboard Login

## Goal

Implement a unified Google Login flow where sellers signing in from the main login page are automatically detected and redirected to their dashboard, while normal customers are redirected to the storefront.

## User Review Required
>
> [!IMPORTANT]
> This plan assumes that a "Seller" status is determined by a `role` field in the `profiles` table. Any user with `role = 'seller'` will be redirected to `/dashboard` regardless of where they initiated the login.

## Proposed Changes

### [Backend] Database & Roles

- **Verification**: Ensure all sellers in the `sellers` table have a corresponding entry in the `profiles` table with `role = 'seller'`.
- **Automation**: Add a trigger (optional but recommended) to sync `role` when a new seller is approved.

### [Frontend] Auth Flow

#### [MODIFY] [AuthCallback.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/pages/AuthCallback.tsx)

- Refine the role-based redirection logic to be more proactive.
- Ensure that if a user has a `seller` role, they are ALWAYS sent to `/dashboard` unless they are explicitly trying to access a storefront account they also own (though usually, accounts are separate).

#### [MODIFY] [Login.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/pages/Login.tsx)

- Simplify the Google Login handler. It doesn't need to set `auth_type` as a "hint" anymore if the backend role is the source of truth.
- Update the UI to reflect that it's a "Universal Login".

## Verification Plan

### Automated Tests

- Mock a Google Login for a user with `role = 'customer'` -> Verify redirect to `/`.
- Mock a Google Login for a user with `role = 'seller'` -> Verify redirect to `/dashboard`.
- Mock a Google Login for a user with `role = 'admin'` -> Verify redirect to `/admin`.

### Manual Verification

1. Open the main `/login` page.
2. Sign in with a Google account already registered as a seller.
3. Confirm direct entry to the Dashboard.

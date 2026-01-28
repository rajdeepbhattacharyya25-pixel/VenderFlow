# PLAN-seller-login

## Goal Description

Explain how seller `rd.bhatt` logs in and access the dashboard. Verify if any manual setup is needed for the first time.

## User Review Required
>
> [!NOTE]
> The system has a specific "Vendor Login" link that sets the context.

## Seller Login Process

1. **URL:** Go to `/login?type=seller` (or click "Vendor Login" at the bottom of the login page).
2. **Credentials:** Use `rd.bhatt.official@gmail.com` + Password (or Google Log in).
3. **Redirect:** The system (`AuthCallback.tsx`) detects the user is a seller (via `profile.role` or `auth_type` session) and redirects to `/dashboard`.

## Verification/Action Items

- [ ] **Ensure Role is Set:** We added the seller to the `sellers` table, but we *also* need to ensure their `profiles` table entry (if used) has `role: 'seller'`.
  - *Check:* Does `rd.bhatt` have a profile row with `role = 'seller'`? If not, `AuthCallback` might default them to customer view `/`.
- [ ] **Manual Override:** If the redirect fails, they can manually visit `/dashboard`.

## Proposed Action (Optional)

If you want to force the role update for this user to ensure auto-redirect works:

```sql
UPDATE public.profiles
SET role = 'seller'
WHERE id = '2c4ace45-c470-4a8c-bbff-0e24c827dc0a';
```

*(I will run this check for you).*

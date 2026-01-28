# PLAN-storefront-auth-flow

## Goal Description

Investigate and document the seller storefront authentication flow. Ensure:

1. Storefronts are PUBLIC (anyone can browse without login)
2. Login button appears for unauthenticated users
3. Sign Out works correctly

## Analysis Summary

### Current Behavior (What I Found)

| Component | Behavior |
|-----------|----------|
| `SellerStorefront.tsx` | **No auth guard** - page loads for everyone |
| `loadSellerBySlug()` | **Public query** - no auth required |
| Product loading | **Public** - products are fetched from Supabase without auth filter |
| Navbar Login button | **Conditional** - shows "Login" if `user === null`, shows Account icon if logged in |

### Root Cause Analysis

The storefront IS public. The issue is likely one of:

1. **You are already logged in** → So Navbar shows Account icon instead of Login button
2. **Browser has cached session** → Supabase auto-restores session from localStorage
3. **Sign Out wasn't working** → Fixed in previous edit (now calls `supabase.auth.signOut()`)

### Verification Steps

1. **Open DevTools** → Application → Local Storage → Clear `sb-*` keys (Supabase session)
2. **Refresh page** → Login button should now appear
3. **Or use Incognito Mode** → Fresh session, no cookies

## User Action Required

> [!IMPORTANT]
> Can you confirm: When you visit `/store/rd-official-store`, do you see the **Account icon** (person silhouette) in the top navbar, or is there genuinely NO Login button at all?

If you see the Account icon, that means you're already logged in. Click it → Go to Account page → Click "Sign Out" button.

## No Code Changes Needed (Potentially)

The current implementation appears correct:

- Storefronts are public ✅
- Login button shows for guests ✅
- Sign Out now works ✅ (fixed earlier)

If the Login button is truly missing even for unauthenticated users, I can investigate further.

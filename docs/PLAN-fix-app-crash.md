# PLAN-fix-app-crash

## Goal Description

Fix the critical issue where "any page is not opening" (White Screen of Death). The likely cause is a syntax error or runtime crash in a root-level component or import, specifically suspected in `SellerStorefront.tsx` (duplicate declarations) or `App.tsx`.

## User Review Required
>
> [!IMPORTANT]
> This is a critical fix. I will proceed immediately after this plan is acknowledged (or via `/fix` if you prefer).

## Proposed Changes

### Phase 1: Fix Syntax Errors (Immediate)

**Goal:** Restore app functionality.

#### [MODIFY] [SellerStorefront.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/pages/SellerStorefront.tsx)

- Remove duplicate state declarations (`cartItems`, `checkoutItems`, `toasts`, etc.) that were accidentally introduced during the merge.
- Ensure all imports are correct.

#### [MODIFY] [App.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/App.tsx)

- Remove the duplicate `<Route path="/auth-callback" ... />` line.
- Verify `SellerGuard` import is valid.

### Phase 2: Verification

**Goal:** Ensure pages load.

- [ ] Load `/login` -> Should appear.
- [ ] Load `/` (Main Storefront) -> Should appear.
- [ ] Load `/store/rd-official-store` -> Should load (and prompt for join if needed).

## Verification Plan

### Automated Tests

- None (Visual check required as I cannot run browser tests blindly on a crashing app).

### Manual Verification

1. Open URL.
2. Check if white screen persists.
3. If fixed, verify the "Join Store" logic again.

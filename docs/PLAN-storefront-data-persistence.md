# Plan: Storefront Customer Data Persistence

## Goal

Ensure that authenticated store customers (via Google Auth) have their personal information, cart, and wishlist data saved to the database, allowing for cross-device persistence and data retention.

## User Context

- **Problem**: Currently, "saving" info in the Account page doesn't persist. Cart and Wishlist are likely local-only.
- **Requirement**: "Make sure it save cart wishlist personal info of the google auth login user (customer)."

## Technical Analysis

- **Current State**:
  - `lib/cart.ts`: Uses `localStorage` only.
  - `Account.tsx`: Uses local state for addresses; profile updates are mocked or incomplete.
  - `Wishlist.tsx`: Likely local state (verified via investigation).
  - **Database**: `store_customers` exists but lacks related tables for addresses, cart, etc.

## Proposed Architecture

### 1. Database Schema Updates

New tables needed in Supabase:

- `store_addresses`: Linked to `store_customers`.
- `store_cart_items`: Linked to `store_customers` and `products`.
- `store_wishlists`: Linked to `store_customers` and `products`.

### 2. Logic Updates

#### A. Personal Info (Profile & Addresses)

- **Profile**: Update `store_customers` table with `phone`, `display_name`, `avatar_url`.
- **Addresses**: Implement CRUD for `store_addresses` in `Account.tsx`.

#### B. Cart Persistence

- **Sync Logic**:
  - On login: Merge local cart with DB cart.
  - On change: Optimistically update UI, sync to DB in background.
- **Modifications**: Update `lib/cart.ts` or create `hooks/useCart.ts` with Supabase integration.

#### C. Wishlist Persistence

- **Modifications**: Update `Wishlist` component/hooks to read/write from `store_wishlists`.

## Implementation Tasks

### Phase 1: Database & Backend

- [ ] Create migration for `store_addresses`, `store_cart_items`, `store_wishlists`.
- [ ] Add RLS policies for customer isolation.

### Phase 2: Personal Information

- [ ] Update `Account.tsx` to fetch/save profile to `store_customers`.
- [ ] Implement Address Management (CRUD) connected to `store_addresses`.

### Phase 3: Cart & Wishlist

- [ ] Create `useCartSync` hook for DB synchronization.
- [ ] Update `Cart` component to use synced data.
- [ ] Create `useWishlist` hook with DB persistence.
- [ ] Update `Wishlist` component.

## Verification

- [ ] **Manual**: Login as Google User -> Add Address -> Refresh -> Verify Address persists.
- [ ] **Manual**: Add Item to Cart -> Logout -> Login -> Verify Item exists.
- [ ] **Manual**: Add to Wishlist -> Check DB -> Refresh -> Verify Wishlist items.

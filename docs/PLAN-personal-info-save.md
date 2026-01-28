# PLAN: Customer Personal Information Saving

Fixing the issue where customers cannot save their personal information (Phone, Gender, Date of Birth, etc.) in the storefront.

## Phase 1: Database Schema update

Add missing columns to the `store_customers` table to store personal information.

- Add `alt_phone` (TEXT, optional)
- Add `gender` (TEXT, optional)
- Add `dob` (DATE/TEXT, optional)

## Phase 2: Backend API & types

Update the `storeAuth.ts` utility to handle the new fields in the `StoreCustomer` interface and `updateStoreCustomer` function.

- Update `StoreCustomer` interface in `lib/storeAuth.ts`.
- Update `updateStoreCustomer` to accept and persist new fields.

## Phase 3: Frontend Implementation

Modify the `Account.tsx` component to correctly fetch and save the new fields.

- Ensure `firstName` and `lastName` are derived from and saved to `display_name`.
- Add local state management for `altPhone`, `gender`, and `dob`.
- Update the `handleSaveProfile` function to include new fields.
- Populate fields on component mount (using `storeCustomer` prop or after fetching).

## Phase 4: Verification

- Verify that saving changes persists the data.
- Verify that the data is correctly loaded after a page refresh.
- Test with different combinations of filled/empty fields.

## Agent Assignments

- **Database Specialist**: Phase 1 (SQL Migration)
- **Backend Specialist**: Phase 2 (Lib/Types updates)
- **Frontend Specialist**: Phase 3 (UI/Component updates)
- **QA/Verification**: Phase 4 (Testing)

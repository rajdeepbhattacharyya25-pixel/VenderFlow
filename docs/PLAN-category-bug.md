# Fix Multi-Category Bug

## Context & Root Cause
Currently, when you select more than one category in the dashboard (e.g., "Clothing", "Home"), the frontend submits the array `["clothing", "home"]` to your database. However, the database column `products.category` is still configured as `text` rather than a PostgreSQL array parameter (`text[]`).

Because of this, the database implicitly saves the array as a single JSON-stringified entry (e.g., `'["clothing", "home"]'`). When the dashboard fetches your products later, it reads this whole string, assumes it's one giant unique category, and displays it confusingly as a new combined "category" chip.

## Proposed Changes

### 1. Database Schema
- **Migrate Column**: Run the existing local migration (`20260330045225_convert_category_to_array.sql`) to convert the `products.category` column from `text` to `text[]`. 
- **Data Cleanup**: Run a custom SQL fix to repair the existing misformatted `'["categoryA", "categoryB"]'` DB entries so that they correctly convert to distinct PostgreSQL text array items.

### 2. Frontend Validation
- **Dashboard (`Products.tsx`)**: The UI already generally supports `Array.isArray()`, but relies on some fallback rules because it expects strings for legacy products. Applying the Postgres migration will fix the multi-category bug natively across all pages and allow us to remove some of the rigid fallback rules.

## Socratic Gate / Open Questions
> [!IMPORTANT]
> - Do you want me to automatically run the database migration and clean up the malformed category strings in the database right now?
> - Are there any specific vintage/custom products whose category names actually *contain* a comma or brackets natively, that might be affected by data cleanup?

## Verification Checklist
- `[ ]` Open the database and verify that the column type is precisely `text[]` and rows have proper array values `{categoryA, categoryB}`.
- `[ ]` Check `Products.tsx` to verify that when adding a new item with 2+ categories, it accurately displays them as distinct chips, rather than one combined chip.
- `[ ]` Ensure storefront components successfully parse out the new arrays.

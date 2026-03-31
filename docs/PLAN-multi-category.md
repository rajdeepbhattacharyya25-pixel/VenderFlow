# Goal
Enable sellers to assign multiple categories to a single product and update storefront filtering to use inclusive OR (ANY) logic for multi-category products.

## User Review Required
> [!WARNING]
> Changing the `category` data structure from `string` to `string[]` is a breaking change for any un-updated client code or edge functions relying on a simple string. The rollout must be synchronized. 

## Proposed Changes

### Database
#### [NEW] `supabase/migrations/[timestamp]_multi_category.sql`
- Create a SQL migration to alter the `products` table.
- Change `category` column to type `text[]`.
- Use `USING string_to_array(category, ',')` to preserve existing single-category values as single-element arrays.

### Core Types & Models
#### [MODIFY] `dashboard/types.ts`
- Change `category?: string;` to `category?: string[];` in the `Product` interface.

### Dashboard & Product Editor
#### [MODIFY] `dashboard/components/products/ProductModal.tsx`
- Replace the existing `select` dropdown with a custom Multi-Select component (checkboxes in dropdown + removable chips/tags).
- Update the global "Manage Categories" (Rename/Delete) functions to handle `text[]` arrays via Postgres array operations or fetching/filtering in JS.
#### [MODIFY] `dashboard/components/products/ProductTable.tsx`
- Render the `category` array as a comma-separated string or small badges instead of a raw string.
#### [MODIFY] `dashboard/pages/Products.tsx`
- Update the `fuse.js` filtering to search through the `category` array.

### Storefront & Shopper Experience
#### [MODIFY] `pages/SellerStorefront.tsx`
- Update the category tabs logic.
- Change `p.category === selectedCategory` to `p.category?.includes(selectedCategory)`.
#### [MODIFY] `pages/PreviewStorefront.tsx`
- Mirror the same changes made to filtering in `SellerStorefront.tsx`.
#### [MODIFY] `components/ViewAll.tsx`
- Update the extraction of unique categories to flatten arrays.

### Edge Functions
#### [MODIFY] `supabase/functions/stylist-recommendations/index.ts`
- Handle `category` as an array when prompting the LLM.
#### [MODIFY] `supabase/functions/process-product-embeddings/index.ts`
- `generateEmbedding(product.category?.join(', ') || "")`

## Open Questions
- What happens to bulk uploaded CSVs where categories are comma-separated? Should we parse them into arrays on upload inside `BulkUploadModal.tsx`?

## Verification Plan

### Automated/Code Verification
- Apply the SQL migration and ensure no constraints fail.
- Type-check the entire repository to ensure all `.category` usages are updated to expect an array.

### Manual Verification
1. Open the dashboard and check the Product Table.
2. Edit a product and add multiple categories using the new chip-based UI.
3. Save and confirm it persists to the DB.
4. Go to the Storefront and verify the product appears under ALL selected category filters.

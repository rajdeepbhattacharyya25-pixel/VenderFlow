# Storefront Light/Dark Mode Fix

## Goal

Fix text visibility and styling issues across the storefront page in both light and dark mode.

## Tasks

- [ ] **BenefitsBar.tsx** — Add full dark mode support → Verify: bar background, text, and icon bubbles visible in dark mode
  - Container: `bg-white` → `bg-white dark:bg-gray-900`
  - Border: `border-gray-100` → `border-gray-100 dark:border-gray-800`
  - Text: `text-gray-500` → `text-gray-500 dark:text-gray-400`
  - Icon bubbles: add `dark:bg-*-900/30 dark:text-*-400` variants for each color

- [ ] **ProductCard.tsx** — Fix `mix-blend-multiply` breaking images on dark backgrounds → Verify: product images visible in dark mode
  - Line 127: `mix-blend-multiply` → `mix-blend-multiply dark:mix-blend-normal`
  - This affects the main product image rendering — `mix-blend-multiply` makes images transparent on dark backgrounds

- [ ] **Storefront.tsx loading state** — Fix text visibility during loading in dark mode → Verify: loading spinner text readable in dark mode
  - Line 733: `text-gray-500` → `text-gray-500 dark:text-gray-400`

- [ ] **Verify** in browser: toggle dark/light mode, check all sections

## Done When

- [ ] All storefront text readable in both modes
- [ ] Product card images visible in dark mode
- [ ] BenefitsBar styled correctly in dark mode

## Verification Plan

### Browser Test

1. Run `npm run dev` (already running)
2. Open `http://localhost:5173` in browser
3. Toggle dark mode via navbar moon/sun icon
4. Verify: BenefitsBar text + icons visible in dark mode
5. Verify: Product card images not washed-out/invisible in dark mode
6. Verify: Loading state text readable (refresh page in dark mode)
7. Toggle back to light mode — verify nothing broke

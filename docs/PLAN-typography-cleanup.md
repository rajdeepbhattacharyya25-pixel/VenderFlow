# PLAN: Typography and Design System Stabilization

**Task Slug**: typography-cleanup
**Created**: 2026-03-31

## Goal
Permanently transition the codebase to "Playfair Display" and "Dark Forest Green", removing legacy font references and diagnostic utilities.

## Phase 1: Global Configuration (Design System)
- `[ ]` Modify `index.css` to define `--color-brand-primary` (#093223), `--color-brand-accent` (#10b981), etc.
- `[ ]` Clean up `index.js` / `index.html` Google Font imports.
- `[ ]` Delete `test-font.html`.

## Phase 2: Component Refactoring
- `[ ]` Update `Hero.tsx` to use semantic colors (`bg-brand-primary`).
- `[ ]` Update `FloatingCollage.tsx` to remove inline `Space Grotesk` fonts.
- `[ ]` Update `OfflineOverlay.css` to standard typography variables.
- `[ ]` Broaden font normalization in `SellerStorefront.tsx`.

## Phase 3: Final Verification
- `[ ]` Visual check of storefront headings and buttons.
- `[ ]` Network inspection for font payloads.
- `[ ]` Grep for residual "Space Grotesk" references.

## Verification Checklist
- [ ] No "Space Grotesk" in CSS/TSX.
- [ ] "Playfair Display" is the absolute default for `.font-heading`.
- [ ] Brand colors centralised in `index.css`.
- [ ] Build completes without errors.

[OK] Plan created: docs/PLAN-typography-cleanup.md
Next steps:
- Review the plan
- Run `/create` to start implementation
- Or modify plan manually

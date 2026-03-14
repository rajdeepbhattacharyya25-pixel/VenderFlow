# Rename Venderflow to Vendorflow

## Overview

The goal of this task is to rename all instances of "venderflow" (and its case variants like "Venderflow", "VenderFlow") to "vendorflow" ("Vendorflow", "VendorFlow") across the entire codebase. This is a large-scale refactoring task that touches UI components, documentation, backend functions, and file names.

## Project Type

WEB

## Success Criteria

- All text references to "venderflow", "Venderflow", and "VenderFlow" are replaced with "vendorflow", "Vendorflow", and "VendorFlow" respectively.
- All files and directories containing "venderflow" in their name are renamed, and their imports/references are updated.
- The application builds successfully without type errors or missing imports.
- Linting passes.

## Tech Stack

- Frontend: React, Vite, Tailwind CSS
- Backend/DB: Supabase Edge Functions
- Build Tools: TypeScript, Node.js

## File Structure

Changes will span across:

- `/components`
- `/pages`
- `/hooks`
- `/public`
- `/supabase/functions`
- `/docs`
- Root config files (`package.json`, etc.)

## Task Breakdown

### Phase 1: Configuration, Documentation, and Public Assets

**Task 1.1**: Search and replace "venderflow" in root config files, markdown documentation, and public assets.

- **Agent**: `frontend-specialist` (or `orchestrator`)
- **Dependencies**: None
- **INPUT**: `package.json`, `manifest.json`, `docs/*.md`, `public/blog/*.md`
- **OUTPUT**: Updated text targeting "vendorflow" in configs and docs.
- **VERIFY**: Run `npm run lint` and verify markdown renders correctly.

### Phase 2: Frontend UI Components & Pages (Text replacement only)

**Task 2.1**: Replace text instances of "Venderflow" in TS/TSX files without renaming the files themselves yet.

- **Agent**: `frontend-specialist`
- **Dependencies**: Phase 1
- **INPUT**: `components/**/*.tsx`, `pages/**/*.tsx`
- **OUTPUT**: Text in UI correctly says "VendorFlow" or "Vendorflow".
- **VERIFY**: Start dev server `npm run dev` and perform a visual check of the landing page and dashboard.

### Phase 3: Backend Services & Edge Functions

**Task 3.1**: Replace text instances of "venderflow" in Supabase edge functions and scripts.

- **Agent**: `backend-specialist`
- **Dependencies**: Phase 2
- **INPUT**: `supabase/functions/**/*.ts`, `scripts/**/*.ts`
- **OUTPUT**: Edge functions use the correct naming.
- **VERIFY**: Run `npx tsc --noEmit` to ensure no TypeScript compilation errors in functions.

### Phase 4: File and Directory Renaming

**Task 4.1**: Rename physical files and folders that contain "venderflow" and update import statements across the codebase.

- **Agent**: `frontend-specialist` / `backend-specialist`
- **Dependencies**: Phase 3
- **INPUT**: Files like `components/WhyVenderflow.tsx`, `hooks/useWhyVenderflowAnimation.ts`, `public/assets/why-venderflow`
- **OUTPUT**: Files renamed to `WhyVendorflow.tsx`, `useWhyVendorflowAnimation.ts`, `why-vendorflow`, and imports updated everywhere.
- **VERIFY**: `npm run build` must succeed with zero missing import errors.

## Phase X: Verification

- [ ] Lint: Run `npm run lint` - MUST pass
- [ ] Type Check: Run `npx tsc --noEmit` - MUST pass
- [ ] Build: Run `npm run build` - MUST succeed
- [ ] Start dev server `npm run dev` and manually verify no console errors in browser.
- [ ] Security Scan: `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`

## ✅ PHASE X COMPLETE

(To be filled after implementation)

- Lint:
- Security:
- Build:
- Date:

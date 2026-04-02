# PLAN: Sentry Error Diagnosis & Resolution

This plan outlines the systematic approach to identifying and resolving production errors captured by Sentry and hardening the monitoring integration.

## Phase 1: Diagnosis & Setup (Research) [COMPLETED]

- [x] **Locate Sentry API Keys**: Confirm the available Sentry Auth Token in the workspace/environment. (Action: Checking Vercel/Local env)
- [x] **Audit notify-admin 401s**: Specifically investigate the authentication failure between `alert-dispatcher` and `notify-admin`. (Fixed: Synchronized DISPATCHER_SECRET)
- [x] **Terminal Log Correlation**: Check local `npm run dev` output for any errors caught during development.

## Phase 2: Sentry Integration Fix (Hardening) [COMPLETED]

- [x] **Enable Vite Plugin**:
  - [x] Uncomment `sentryVitePlugin` in `vite.config.ts`.
  - [x] Ensure `VITE_SENTRY_DSN` and build-time env vars (Org: `vendorflow`, Project: `javascript-react`) are correctly mapped.
- [x] **instrument.ts Initialization**: Implemented dynamic import for Sentry and ensured global availability for `logAlert`.

## Phase 3: Error Resolution & Linting (Active)

- [x] **Fix Auth Leak**:
  - [x] Synchronized `DISPATCHER_SECRET` across all Edge Functions using the `secureInvoke` pattern.
- [ ] **Linting Cleanup**: Reduce the 600+ linting warnings (focusing on `no-unused-vars` and `no-explicit-any`).
- [ ] **Source Map Verification**: Confirm that build artifacts include source maps intended for Sentry upload.

## Phase 4: Verification & Final Checks

- [ ] **Post-fix Audit**: Run the application and verify no 401 or 500 errors appear in the Supabase/Sentry console.
- [ ] **Build Validation**: Execute a production build locally to ensure the Sentry Vite plugin succeeds.
- [ ] **Project Audit**: Run `python .agent/scripts/checklist.py .` to ensure deployment safety.

## Verification Checklist

- [x] All Edge Function 401s resolved?
- [x] Sentry Vite plugin re-enabled and configured?
- [ ] Source maps verified in build target?
- [ ] Top priority Sentry bugs fixed?

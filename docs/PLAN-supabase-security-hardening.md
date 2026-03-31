# /plan - Supabase Security Hardening (REFINED)

Created: 2026-04-01

## 🛡️ Strategic Decisions Summary (Updated)
- **Financial/Risk Tables**: Restricted to Admins + `service_role` (WITH CHECK logic).
- **Audit Trails**: `created_by` and `created_at` added to core ledger/risk tables.
- **Search Path**: Explicitly `SET search_path = public, pg_temp;`.
- **Public Funnels**: `anon` INSERT only (hardened), SELECT/UPDATE/DELETE blocked.
- **Oracle Views**: `SECURITY DEFINER` + `WITH (security_barrier)` + `auth.uid()` filtering.
- **Orphan Tables**: Baseline `USING (false) WITH CHECK (false)`.

## 📋 Task Breakdown

### Phase 1: Analysis & Preparation (DONE)
- [x] Verify `profiles` table for `role` column.
- [x] Identify filtering keys for `oracle_*` views.
- [x] Confirm table structures for audit trail addition.

### Phase 2: Migration Implementation
- [ ] Create `supabase/migrations/20260401000000_security_hardening.sql`.
- [ ] Implement hardened RLS for:
    - Ledger/Risk (Admin only)
    - Debug Logs (Service only)
    - Public Funnels (Hardened Insert)
- [ ] Harden Search Paths for all public functions.
- [ ] Redefine Oracle views with `security_barrier` and tenant filtering.
- [ ] Apply baseline DENY-ALL to all 14 orphaned tables.

### Phase 3: Verification & Audit
- [ ] Run `supabase_mcp_server.get_advisors(type='security')`.
- [ ] Run `.agent/skills/vulnerability-scanner/scripts/security_scan.py`.
- [ ] Verify `oracle_payout_gaps` filtration (user-specific only).

## 🚀 Verification Checklist
- [ ] **Security advisor returns 0 ERRORS/WARNINGS**.
- [ ] **`handle_new_user` works** (confirm with new profile creation).
- [ ] **`debug_logs` insertion works** (only for system).
- [ ] **Data isolation verified** (no cross-tenant leakage).

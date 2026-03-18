# Shared Access Implementation Plan

## Goal
Implement a robust Role-Based Access Control (RBAC) system for the seller dashboard with secure Magic Link authentication, sidebar pruning, and audit logging.

## Tasks
- [ ] **DB Migration**: Add `permissions` (JSONB) to `store_staff` and `store_id` to `audit_logs` → Verify: `supabase db diff` shows changes.
- [ ] **Backend (Edge Function)**: Update `manage-staff` to handle role assignments and emit audit logs → Verify: Add staff via Dashboard, check `store_staff` and `audit_logs` tables.
- [ ] **Security (Auth Guard)**: Update `SellerGuard.tsx` to allow authenticated staff members based on their `store_staff` record → Verify: Log in as staff, access dashboard.
- [ ] **Frontend (Auth Flow)**: Update `SharedAccessPanel.tsx` to generate Magic Link QRs and include a role management UI → Verify: Generate QR, scan, see redirection.
- [ ] **Frontend (RBAC)**: Implement sidebar pruning in `Sidebar.tsx` and route-level permission checks → Verify: Log in as "Sales", verify "Settings" is hidden.
- [ ] **Audit Trail**: Implement a simple audit log viewer in the dashboard settings → Verify: View recent actions (e.g., "Product Created") in the UI.

## Done When
- [ ] Staff can log in securely via Magic Link/QR.
- [ ] Dashboard UI restricts features based on assigned roles (Owner, Admin, Manager, Sales, Staff).
- [ ] Actions performed by staff are tracked in the Audit Log.

## Verification Plan
### Automated Tests
- Run `npm run test` (if applicable) for component logic.
- Run `python .agent/skills/vulnerability-scanner/scripts/security_scan.py` to ensure auth safety.

### Manual Verification
- **Role Test**: Create a "Sales" user, confirm they cannot access Billing/Settings.
- **Magic Link Test**: Use a generated QR to log in on a separate device.
- **Audit Test**: Update a product as staff, verify log shows the change with correct actor.

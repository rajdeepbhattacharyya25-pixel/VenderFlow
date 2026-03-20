# 🏥 VendorFlow Technical Health Checklist

This checklist is used to maintain project hygiene and operational stability.

## Daily Checks

- [x] **Sentry Dashboard:** Setup verified as robust; noise filters active.
- [x] **Supabase Logs:** Verified Edge Function success rates (~100% in recent logs).
- [ ] **Backups:** Cron verified; `audit_logs` schema check pending refinement.
- [x] **Quotas:** Both sellers (RD Official, Lopamudra) at 200/200 messages remaining.

## Weekly Maintenance

- [ ] **Dependency Audit:** Run `npm audit` to check for vulnerabilities.
- [ ] **Performance Audit:** Run `npm run lighthouse` and check Core Web Vitals.
- [x] **RLS Audit:** Verified RLS hardening for `platform_settings`, `profiles`, and `email_logs`.

## Monthly Review

- [ ] **Sales Report:** Generate automated bookkeeping export for active sellers.
- [ ] **Risk Score Refresh:** Recalculate `seller_risk_scores`.

---
*Last Audit: 2026-03-18 (Status: Healthy)*

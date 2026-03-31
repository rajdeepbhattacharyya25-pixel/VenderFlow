# PLAN: Hybrid Error Management & Notification System

## 1. Overview

Refine the existing `system_alerts` infrastructure to serve as the single source of truth for both system-wide and seller-specific issues. The system will handle logging, deduplication, and multi-channel routing (Telegram for critical admin alerts, Realtime/Bell for sellers).

## 2. Context & Research

- **Existing Table:** `public.system_alerts` already exists (as of migration `20260313000004_observability.sql`).
- **Existing Functions:** `create_system_alert` RPC is available.
- **Project Structure:** Uses Supabase Edge Functions for `notify-admin` and `send-push`.

## 3. Socratic Gate (Resolved)

- [x] **Deduplication Fingerprint:** Use structured metadata (`operation_type`, `resource_id`, `error_code`) to derive the fingerprint.
- [x] **Throttling Window:** Severity-based (Critical: no suppression, Warning: 15-30m, Info: 1-2h).
- [x] **Actionable Alerts:** Use `action_type` (enum-like string) and `action_payload` (JSON).

---

## 4. Proposed Changes

### Phase 1: Database Layer (SQL)

- **Deduplication Logic**:
  - `critical`: Always insert new record.
  - `warning`: Check for same `fingerprint` within last 30 minutes.
  - `info`: Check for same `fingerprint` within last 2 hours.
- If a duplicate exists, update `occurrence_count` and `last_seen_at`.
- Refine **Database Trigger**:
  - `AFTER INSERT OR UPDATE` to notify `alert-dispatcher` when a new notification is "due" (e.g., only on first occurrence or after throttle window expires).

---

### Phase 2: Alert Dispatcher (Edge Function)

#### [NEW] `supabase/functions/alert-dispatcher/index.ts`

- **Routing Logic:**
  - If `severity = 'critical'` AND `recipient = admin`: Call `notify-admin` (Telegram).
  - If `seller_id` is present: Call `send-push` or prepare for Realtime UI.
- **Handle Throttling**: Ensure we don't re-dispatch a notification for the same fingerprint within the cooldown period (unless the severity escalates).

---

### Phase 3: Seller Notification UI (Vite/React)

#### [MODIFY] `dashboard/components/NotificationBell.tsx`

- Subscribe to `system_alerts` via **Supabase Realtime**.
- Filter alerts where `seller_id` matches the current user.
- Display a count of unread/unacknowledged alerts.

#### [NEW] `dashboard/components/AlertItem.tsx`

- Render the alert title/message.
- Display conditional "Action" buttons (e.g., "Retry Now" if `action_type == 'RETRY'`).

---

### Phase 4: Integration (Frontend)

#### [MODIFY] `lib/notifications.ts`

- Create a high-level helper `logAlert()` that calls the Supabase RPC.
- Example usage in `process-backup`:

  ```typescript
  if (failed) {
    logAlert({
      type: 'BACKUP_FAILED',
      severity: 'warning',
      seller_id: '...',
      action: { type: 'RETRY', data: { backup_id: '...' } }
    });
  }
  ```

---

## 5. Verification Plan

### Automated Tests

- DB script to insert 50 identical alerts and verify only 1 row is created + `occurrence_count` is 50.
- Verify `alert-dispatcher` logs show it skipped Telegram for `info` and `warning` alerts.

### Manual Verification

- Trigger a fake backup failure and check the Seller Dashboard for the bell notification.
- Click the "Retry" action and verify it triggers the expected logic.

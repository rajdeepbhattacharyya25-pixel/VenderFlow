# [OK] Plan created: docs/PLAN-telegram-admin-notifications.md

Next steps:
- Review the plan below
- Run `/create` to start implementation
- Or modify plan manually

---

# PLAN: Telegram Admin Notifications Integration

Implement persistent admin notification preferences in the database (Supabase) to ensure settings are synchronized across all devices and respected by the Telegram notification engine.

## Task Breakdown

### Phase 1: Database Migration
- [ ] Add `notification_preferences` JSONB column to `profiles` table.
- [ ] Default value: `{"backup_success": true, "backup_failed": true, "new_message": true, "system_alert": true}`.
- [ ] Ensure RLS policies allow admins to update their own preferences.

### Phase 2: Frontend Implementation
- [ ] Update `AdminNotificationsPanel.tsx` to fetch/save preferences from Supabase.
- [ ] Remove `localStorage` dependency.
- [ ] Add loading indicators and optimistic updates for toggle buttons.

### Phase 3: Edge Function Update
- [ ] Modify `notify-admin` Edge Function to query `profiles` (where `role = 'admin'`).
- [ ] Check `notification_preferences` for each admin.
- [ ] Filter outgoing Telegram messages based on these preferences.

### Phase 4: Verification
- [ ] Test persistence across different browsers.
- [ ] Manually trigger notification events and verify filtering logic.
- [ ] Run `python .agent/scripts/checklist.py .`.

## Agent Assignments
- **Database Architect**: Migration script.
- **Frontend Specialist**: `AdminNotificationsPanel.tsx` updates.
- **Backend Specialist**: `notify-admin` Edge Function logic.

## Verification Checklist
- [ ] Settings persist after page refresh.
- [ ] Settings sync between two different browser sessions.
- [ ] Telegram message is NOT sent when preference is toggled OFF.
- [ ] Telegram message IS sent when preference is toggled ON.

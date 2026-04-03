# PLAN-clear-chats.md

## GOAL: Clear Support Tickets and Messages
Clean up the database by removing all existing support ticket data and related notifications while ensuring no impact on the underlying application logic. 

## User Review Required
- [x] Confirmed: Delete ALL existing chats/tickets.
- [x] Confirmed: Ensure no logic changes (data deletion only).
- [ ] **Question**: Should I also clear the `notifications` table of records with type `support`? (Recommended to ensure the UI is fully clean).

## Proposed Changes

### Database Cleanup

#### [DATA] [public.support_messages](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/supabase/migrations/delete_data_support_messages.sql)
- Execute DELETE query for all rows in `public.support_messages`.

#### [DATA] [public.support_tickets](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/supabase/migrations/delete_data_support_tickets.sql)
- Execute DELETE query for all rows in `public.support_tickets`.

#### [DATA] [public.notifications](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/supabase/migrations/delete_data_support_notifications.sql)
- Execute DELETE query for all rows in `public.notifications` where `type = 'support'`.

---

## Verification Plan

### Manual Verification
- Check the Support Tickets UI to ensure it is empty.
- Verify that "New Ticket" functionality still works by creating a test ticket.
- Verify that other system areas (orders, products) are unaffected.

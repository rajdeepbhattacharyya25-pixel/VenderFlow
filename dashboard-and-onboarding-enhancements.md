# Dashboard and Onboarding Enhancements

## Goal
Improve the seller dashboard and admin experience with better data visualization and management tools, and optimize the "Apply to Sell" onboarding flow with a multi-step indicator, auto-save, and instant validation.

## Let's clarify a few things before executing:
> [!IMPORTANT]
> - **Charts:** Which charting library should we use for data visualization? (e.g., Recharts, Chart.js)
> - **Auto-save:** Should we save the application draft to `localStorage`, or persist it to the database (Supabase)?
> - **Notification Hub:** Do you prefer a slide-out panel or a dropdown menu for the Notification Hub?

## Tasks
- [x] Task 1: Add interactive charts (sales/traffic) to Seller Dashboard -> Verify: View dashboard and see charts rendering mock/real data
- [x] Task 2: Enhance Product Management UX (bulk edits, improved image upload) -> Verify: Test selecting multiple products and uploading an image
- [x] Task 3: Upgrade Notification Hub with real-time toast alerts or dropdown menu -> Verify: Trigger a notification and observe UI
- [x] Task 4: Integrate a multi-step progress indicator (Stepper) into `ApplyToSell.tsx` -> Verify: Navigate through form steps and see stepper update
- [x] Task 5: Implement real-time auto-save for `ApplyToSell.tsx` form data -> Verify: Enter data, refresh page, and see data restored
- [x] Task 6: Add micro-interactions and instant field validation to onboarding form -> Verify: Enter invalid data and see instant error feedback

## Done When
- [x] Seller Dashboard features interactive charts and improved product management tools.
- [x] Notification Hub is easily accessible via a modern UI panel or alerts.
- [x] Onboarding flow is multi-step, auto-saves progress, and provides instant validation feedback.

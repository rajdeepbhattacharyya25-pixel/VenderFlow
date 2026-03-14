# PLAN: API Usage Monitoring & Emergency Alerts

## 1. Overview

Implement a robust monitoring system to track 3rd-party API usage (e.g., Groq, Gemini) across VendorFlow. The system will log usage, display visual analytics on the Admin Dashboard, and automatically send emergency Telegram alerts to the admin when a service hits 90% of its monthly limit.

## 2. Database Schema (Supabase)

### **Table: `api_usage_logs`**

Tracks individual API requests made by the system.

- `id` (uuid)
- `provider` (string: 'groq', 'gemini', etc.)
- `endpoint` (string)
- `status_code` (integer)
- `created_at` (timestamp)

### **Table: `api_limits_config`**

Manages billing limits and alerting thresholds to avoid runaway costs.

- `provider` (string, primary key)
- `monthly_limit` (integer: max allowed requests per month)
- `alert_threshold_pct` (integer: default 90)
- `last_alert_sent_at` (timestamp: to prevent Telegram notification spam)

## 3. Edge Function Updates

- **Usage Logging:**
  Create an abstraction/utility within Supabase Edge Functions to write to `api_usage_logs` after every 3rd-party API call (starting with `ai-smart-setup`).
- **Threshold Detection & Alerting:**
  Calculate the current month's usage upon logging. If usage > 90% of the limit and an alert hasn't been sent recently:
  - Trigger the existing `notify-admin` Telegram Edge Function using the `SYSTEM_ALERT` payload.

## 4. Admin Dashboard UI (`dashboard/pages/Reports.tsx` or new `SystemStatus.tsx`)

- **Visual Graphs:**
  Integrate a charting library (e.g., Recharts, if already used in the project) to display a daily usage bar/line chart separated by API provider.
- **Critical Services Section:**
  Add a warning panel displaying progress bars for each API (Current Usage vs. Monthly Limit). If a progress bar hits 90%, style it in bold red with a warning icon to grab the admin's attention.

## 5. Verification Checklist

- [x] Ensure `api_usage_logs` table captures data correctly when `ai-smart-setup` is fired.
- [x] Artificially lower the `monthly_limit` in the database to trigger the 90% threshold.
- [x] Verify the Telegram bot immediately receives the "Critical API Limit" alert.
- [x] Verify the Admin UI correctly aggregates and visualizes the logs via graphs.

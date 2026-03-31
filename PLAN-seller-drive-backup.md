# Seller Google Drive Backup System

## Overview
Implement a comprehensive, secure, and user-friendly Google Drive backup system for the seller dashboard. The system generates two distinct backup formats (a machine-readable restore JSON consisting of complete data, and a human-readable ZIP archive without internal technical fields) via an asynchronous background job. It stores the backups securely on the seller's personal Google Drive using OAuth. 

## Project Type
**WEB**

## Success Criteria
- **Seller OAuth:** Sellers authenticate their own Google Drive account.
- **Dual Backup Artifacts:** 
  - `vendorflow_backup_restore_YYYY-MM-DD_HH-mm-ss.json` (Includes full schemas, embeddings, and versions for automated recovery).
  - `vendorflow_backup_YYYY-MM-DD_HH-mm-ss.zip` (Clean CSVs with summaries, explicitly excluding embeddings).
- **Asynchronous Execution:** Backup runs in the background. The UI shows real-time job statuses (🟡 In Progress, 🟢 Completed, 🔴 Failed).
- **Retention & Fallback:** System keeps the 5 most recent backups per seller (with a toggle to "Keep all backups"). Fallback local download is available if Drive upload fails.
- **Security:** RLS protects backup history and OAuth credentials. No cross-seller data exposure.

## Tech Stack
- **Database/Backend:** Supabase (Postgres for job/token storage, Edge Functions/pg_net for Async processing)
- **Frontend:** React, Tailwind CSS
- **Integration:** Google Drive API v3 (OAuth2)
- **Libraries:** JSZip (for ZIP file creation)

## File Structure
#### Backend / Supabase
- **`supabase/migrations/XXX_add_backup_history.sql`** (Tables for `seller_integrations` tracking OAuth tokens and `backup_jobs` for history)
- **`supabase/functions/google-oauth-callback/`** (Edge function to handle OAuth redirect and token storage)
- **`supabase/functions/process-backup/`** (Background worker to fetch data, generate ZIP/JSON, upload to Drive, and enforce retention)

#### Frontend
- **`src/components/dashboard/backup/BackupManager.tsx`** (Main UI for settings, connect button, and history list)
- **`src/hooks/useDriveBackup.ts`** (Hook to manage backup state, polling for job completion, and handling OAuth redirects)
- **`src/services/api/backup.ts`** (Logic to trigger and poll backup status)

## Task Breakdown

### Task 1: Supabase Database and RLS Migration
- **Agent**: `database-architect`
- **Input:** Database schema requirement.
- **Output:** A migration creating `seller_integrations` (encrypted OAuth tokens) and `backup_jobs` (status, file links, sizes, timestamps).
- **Verify:** RLS restricts sellers to viewing only their jobs/tokens. Schema valid and migrated successfully.

### Task 2: Google Drive OAuth Setup & Edge Function
- **Agent**: `backend-specialist`
- **Input:** Google Cloud Console OAuth credentials.
- **Output:** An Edge Function for OAuth authorization and callback handling, saving tokens securely to the database.
- **Verify:** Seller can click to authorize Google Drive, and tokens are stored successfully.

### Task 3: Asynchronous Backup Processor
- **Agent**: `backend-specialist`
- **Input:** Backup Trigger.
- **Output:** An Edge function that:
  1. Fetches seller data (Profile, Products, Orders).
  2. Creates the human-readable text contents (filtering out embeddings).
  3. Zips the content.
  4. Generates the full restore JSON.
  5. Uploads both to Google Drive `VendorFlow Backups/{seller_id}/`.
  6. Applies retention logic (keep last 5).
- **Verify:** Files appear in Drive formatting correctly. No embeddings in the CSVs.

### Task 4: Seller Dashboard Backup UI
- **Agent**: `frontend-specialist`
- **Input:** Backup APIs.
- **Output:** A robust dashboard interface showing standard Backup Management (Connect, Trigger Backup, History List, Retention toggle), job polling, and UI states (In Progress, Completed, Failed).
- **Verify:** Triggering backup updates the UI progressively. Manual download fallback functions if Google Drive fails.

## Phase X: Verification
- [ ] Run Core Security Checklist (`checklist.py` / `verify_all.py` against backend/schema).
- [ ] Test the exact structure of the human-readable ZIP to guarantee no internal fields/embeddings have leaked into CSVs.
- [ ] Simulate Drive upload failure and assert the `Manual Download` UI is shown.
- [ ] Validate RLS to ensure a seller cannot fetch or execute another seller's backup. 

## ✅ PHASE X COMPLETE
- Lint: [ ]
- Security: [ ]
- Build: [ ]
- Date: [Pending]

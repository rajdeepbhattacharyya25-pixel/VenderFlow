# PLAN: Financial Oracle Boost (Accuracy & Strategic Simulation)

## Overview
This plan outlines the enhancement of the "VendorFlow Financial Oracle" on the Admin Dashboard. We aim to increase trust through visible reasoning layers and empower decision-making through "What-If" financial simulations.

---

## Phase 1: Context & Data Enrichment
- **Goal:** Provide the AI with the current system rules from `platform_settings`.
- **Tasks:**
    - Update `ai-oracle-brain` function to fetch `platform_settings` (commission rates, payout delays, etc.) as baseline context.
    - Enhance `oracle_payout_gaps` and `oracle_projected_cashflow` views to include risk-weighted projections.

## Phase 2: The "Cognitive" Brain (Option A)
- **Goal:** Implement Chain-of-Thought (CoT) for internal verification.
- **Tasks:**
    - **Prompt Engineering:** Update the system prompt to require a `<thinking>` block.
    - **Hidden Verification:** Ensure the `<thinking>` block is stripped from the `analysis` field but used to validate stats.
    - **Explanation Layer:** Update the JSON schema to include:
        - `explanation_bullets`: Concise reasoning for humans.
        - `decision_metrics`: key numbers used in the logic.
        - `why_summary`: A "Why this recommendation?" paragraph.

## Phase 3: Strategic Simulations (Option C)
- **Goal:** Enable "What-If" scenarios for liquidity and reserves.
- **Tasks:**
    - **Scenario Injection:** Add an optional `scenario_overrides` object to the function request (e.g., `{ "reserve_rate": 0.15 }`).
    - **Simulation Prompting:** Instruct the AI to respond differently if `scenario_overrides` are present, comparing "Baseline" vs "Simulated" outcomes.
    - **Actionable Deep-Links:** Inject `action_url` into the response linking to relevant admin pages (Sellers, Payouts, Disputes).

## Phase 4: UI/UX Refinement
- **Goal:** Present the new layers cleanly in the Admin Sidebar.
- **Tasks:**
    - **Message Rendering:** Update `FinancialOracle.tsx` to render the `explanation_bullets` and `decision_metrics` in a structured accordion or list.
    - **Simulation Controls:** Add a "Scenario Mode" toggle or quick-input tiles for common "What-If" questions.
    - **Execution Links:** Add direct navigation buttons for `action_url`.

---

## Verification Plan
### Automated Tests
- **Edge Function Unit Tests:** Mock `supabase.functions.invoke` with various scenario overrides and verify JSON structure compliance.
- **Prompt Regression:** Verify the AI identifies the `thinking` block requirements.

### Manual Verification
- **Scenario Check:** Ask "What happens if we double the reserve for Seller X?" and verify the AI calculates the liquidity change.
- **Link Check:** Click a recommended `action_url` and ensure it routes to the correct Admin page.

---

## Agent Assignments
- **`backend-specialist`:** Edge Function logic & SQL View enhancements.
- **`frontend-specialist`:** Sidebar UI/UX & Navigation logic.
- **`debugger`:** Accuracy verification & PII scrubbing audit.

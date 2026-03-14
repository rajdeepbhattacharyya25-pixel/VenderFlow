# AI-Powered "Smart Setup" (v1: Text Generation)

## Overview

This plan outlines the implementation of an AI wizard (Smart Setup) for new sellers. Upon onboarding, the wizard will ask for a few keywords or business categories. It will then generate optimized text content for the seller (e.g., store description, initial category names, and SEO tags). Sellers will be prompted with a review screen to approve or modify the suggested content before it is committed to the database.

**Project Type:** WEB

## Success Criteria

- New sellers can input 2-3 keywords/phrases to trigger AI generation.
- The AI responds within 5-10 seconds with optimized store descriptions, initial product categories, and basic SEO tags.
- The seller is navigated to a Review & Edit screen containing the AI suggestions.
- Sellers can edit the text natively and press "Save & Publish."
- Estimated API costs remain significantly under $1/month for the first 10,000 requests.

## Tech Stack & API Cost Strategy

- **Frontend Flow:** React (Next.js/Vite) forms & state management for the wizard steps.
- **Backend Function:** Supabase Edge Function (`ai-smart-setup`) to proxy calls to the LLM API to protect keys.
- **LLM Provider:** We will use **Groq** (because of its extreme speed, reducing wait time) or **Gemini API**. Since you currently have free tiers, both will cost $0.00 right now.
  
  *Paid Tier Cost Calculation (Monthly Estimate):*
  - Average prompt size per seller onboarding: 500 input tokens.
  - Average response size: 300 output tokens.
  - Total tokens per seller: 800 tokens.
  - If you acquire 100 new sellers/month = 80,000 tokens/month.
  - Cost of Groq (Llama-3-8b): ~$0.05 / 1M input, $0.08 / 1M output $\approx$ **$0.01 per month**.
  - Cost of Gemini 1.5 Flash: ~$0.075 / 1M input, $0.30 / 1M output $\approx$ **$0.05 per month**.
  - *Conclusion: Unless you surpass 10,000+ new store registrations per month, your API costs for this text generation endpoint will effectively be a few cents per month.*

## File Structure

```text
├── supabase/
│   └── functions/
│       └── ai-smart-setup/
│           └── index.ts               # Edge function securely calling Groq/Gemini API
├── components/
│   └── onboarding/
│       ├── SmartSetupWizard.tsx       # Initial prompt screen for sellers
│       └── AIReviewScreen.tsx         # Dedicated screen to review and modify AI output
├── pages/
│   └── Onboarding.tsx                 # Updated to incorporate the SmartSetup tools
└── lib/
    └── supabase/
        └── ai.ts                      # Supabase client wrapper to call the ai-smart-setup edge function
```

## Task Breakdown

### 1. Implement Edge Function `ai-smart-setup`

- **Agent:** backend-specialist
- **Priority:** P1
- **Dependencies:** None
- **INPUT:** Edge function setup using Deno, requiring secure API keys managed in Supabase Vault/Dashboard.
- **OUTPUT:** Deployed Supabase Edge Function that receives a `prompt` string and returns JSON structured AI suggestions.
- **VERIFY:** Calling the function from a REST client directly returns a JSON object with `{ storeDescription: "...", tags: ["..."] }` without exposing the API key to the frontend.

### 2. Create `SmartSetupWizard.tsx` component

- **Agent:** frontend-specialist
- **Priority:** P2
- **Dependencies:** Task 1
- **INPUT:** Basic React form accepting keyword strings.
- **OUTPUT:** A polished input modal/form with a 'magic/sparkle' button to trigger the API request. Include a loading/skeleton state to keep the user engaged while waiting for the AI response.
- **VERIFY:** Component correctly captures the inputs and enters a realistic loading state.

### 3. Create `AIReviewScreen.tsx` component

- **Agent:** frontend-specialist
- **Priority:** P2
- **Dependencies:** Task 2 (UI transition)
- **INPUT:** The JSON data returned from the `ai-smart-setup` function.
- **OUTPUT:** An interactive form pre-filled with the AI content. Let the seller edit the description inside a Textarea or standard inputs, effectively keeping the "human in the loop."
- **VERIFY:** Seller can change a word in the AI description and click "Accept," reflecting the custom change in the master state.

### 4. Integrate into the Main Onboarding Flow

- **Agent:** frontend-specialist
- **Priority:** P1
- **Dependencies:** Task 1, 2, 3
- **INPUT:** Existing `StoreRegister.tsx` / `ApplyToSell.tsx` flows.
- **OUTPUT:** A seamless path where users creating a store are offered the option to "Use AI Setup" or "Skip." If "Use AI Setup", they are piped through Tasks 2 & 3 before storing the details in the `stores` table via Supabase RPC/Insert.
- **VERIFY:** End-to-end test. Register a new user -> Ask AI for help -> Receive text -> Edit slightly -> Save. Verify the DB possesses the saved text correctly.

## ✅ Phase X: Verification

- [ ] Lint: Run `npm run lint` & ensure no TypeScript errors exist in the new components.
- [ ] Security: The LLM API Key is **never** shipped in the frontend bundle. It exists *only* in Supabase Edge Function environment variables.
- [ ] Build: Application successfully builds via `npm run build`.
- [ ] Manual test: Walkthrough the new smart setup flow as a brand new seller to observe latency and token generation accuracy.

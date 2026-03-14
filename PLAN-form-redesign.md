# Overview

Redesign the "Apply to Sell" form so that it opens as a mobile-responsive full-screen takeover directly from the landing page. It will feature structural microanimations (staggered field entrances, smooth step transitions) and a highly polished success state animation.

# Project Type

WEB

# Success Criteria

- Form is a pristine full-screen takeover on mobile devices, removing unnecessary headers/footers to enhance focus (touch-first design principles).
- Inputs, steps, and buttons feature sleek microanimations.
- Success state incorporates an engaging, cinematic animation utilizing `framer-motion`.
- Fully responsive across desktop, tablet, and mobile breakpoints.

# Tech Stack

- React
- Tailwind CSS
- framer-motion (for microanimations, layout transitions, and the success state)
- lucide-react (for iconography)

# File Structure

- `pages/ApplyToSell.tsx`: Will be overhauled to implement the full-screen takeover layout, microanimations, and the success state sequence.
- `App.tsx` (or top browser router structure): Ensure the `/apply` route handles the takeover cleanly.

# Task Breakdown

## Task 1: Refactor ApplyToSell into Full-Screen Takeover

- **INPUT**: Existing `ApplyToSell.tsx` with standard layout constraints.
- **OUTPUT**: A modified `ApplyToSell.tsx` that uses `min-h-[100dvh]` and `w-full` with an immersive background, acting as a full-screen takeover. The standard persistent header will be hidden or integrated as a minimal "Close/Back" overlay button.
- **VERIFY**: Load the `/apply` route on a mobile viewport setting. Validate there are no distracting navigation elements and the layout fills the screen perfectly.

## Task 2: Implement Form Microanimations

- **INPUT**: Static `FloatingInput`, `FloatingSelect`, `Stepper`, and `FloatingTextarea` in `ApplyToSell.tsx`.
- **OUTPUT**: Integration of `framer-motion`. Incorporate layout animations for step transitions (`AnimatePresence`) and staggered entrance animations for the individual form fields to make the interface feel alive.
- **VERIFY**: Complete step 1 and verify the transition to step 2 is smooth (no layout snapping). Verify inputs gracefully animate on mount.

## Task 3: Build Success State Animation

- **INPUT**: The current static conditional success render in `ApplyToSell.tsx`.
- **OUTPUT**: A custom `framer-motion` success sequence. Elements include a path-tracing checkmark animation, a localized glow pulse, and staggered typography reveals.
- **VERIFY**: Submit a test application (or spoof the success state) and observe the end-to-end animation flow.

# Phase X: Verification

- [ ] Ensure Socratic Gate was respected.
- [ ] No purple/violet hex codes used.
- [ ] Verify touch targets on mobile (buttons, inputs) are >= 44px.
- [ ] Run `npm run lint` && `npx tsc --noEmit`
- [ ] Run UX/Touch audits using Python validation scripts if necessary.

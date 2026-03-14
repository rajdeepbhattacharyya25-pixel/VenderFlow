# Overview

The user requested to change the primary "bolt" (bold) font used in the parallax sections (such as "Complete Commerce" and other `font-display` components) to a font that better complements the dark, high-end, glassmorphic theme of the e-commerce landing page.

# Project Type

**WEB**

# Success Criteria

- The bold, tracking-tight headings use a premium, modern font.
- Recommended font families for this style: **Clash Display**, **Space Grotesk**, **Syne**, or **Bricolage Grotesque**.
- The change is smoothly integrated into the Tailwind configuration and imported properly, affecting all `font-display` usages or specific components automatically.

# Tech Stack

- React
- Tailwind CSS
- Google Fonts or custom font integration

# File Structure

- `index.css`: Import the selected Google Font `url(...)`.
- `tailwind.config.js`: Add/update the `fontFamily.display` extended theme property to use the new font.
- `components/ParallaxSections.tsx`: Verify the bold headings (`font-display`, `font-black`) look correct with the newly imported font.

# Task Breakdown

- [ ] **Task 1: Select and Import Font**
  - **Agent**: `frontend-specialist`
  - **Priority**: P0
  - **Dependencies**: None
  - **INPUT**: Current configuration and CSS files.
  - **OUTPUT**: Add the chosen font import (e.g., Space Grotesk or Syne) to `index.css` and update the `fontFamily` setup in `tailwind.config.js`.
  - **VERIFY**: Check the local dev server ensuring the font loads and no network errors are thrown.

- [ ] **Task 2: Review and Adjust Typographic Styles**
  - **Agent**: `frontend-specialist`
  - **Priority**: P1
  - **Dependencies**: Task 1
  - **INPUT**: Re-render of `ParallaxSections.tsx`.
  - **OUTPUT**: Adjust tracking (letter-spacing), weight, or sizing if the new font appears too large or disproportionate.
  - **VERIFY**: Visual confirmation on the "Complete Commerce" section to ensure it feels premium and complements the surrounding parallax layout.

# Phase X: Verification

- [ ] Lint: Pass (run `npm run lint`)
- [ ] Security: No critical issues (run `.agent/scripts/checklist.py`)
- [ ] Build: Success (run `npm run build`)

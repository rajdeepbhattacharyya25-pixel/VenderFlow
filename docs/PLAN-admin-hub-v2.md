# PLAN: Admin HUD v2 - Multi-Spectral Redesign

## Overview
Elevating the Admin HUD from a static Emerald theme to a dynamic **Multi-Spectral HUD** (Emerald/Cyan/Amber/Red) with modular windowing and high-density data overlays.

## Success Criteria
- [ ] Semi-draggable "Modular Window" layout implementation.
- [ ] Color semantics: Emerald (Healthy), Cyan (Info), Amber (Warning), Red (Critical).
- [ ] High-density "Intel Layers" (Hex-grids, data streams) in Financial Oracle.
- [ ] Interactive micro-animations for key telemetry data.

## Tech Stack
- **React 18** (Vite)
- **Tailwind CSS v4** (Utility-first styling)
- **Lucide-React** (Technical iconography)
- **React-Draggable** (Optional, or lightweight custom implementation)

## Task Breakdown

### Phase 1: Foundation & Tokens
- **Task 1: Define Multi-Spectral Palette**
  - Add specific HEX codes for HUD_Cyan (#00F0FF), HUD_Amber (#FFB800), and HUD_Red (#FF003C) to `index.css`.
  - [INPUT: index.css → OUTPUT: updated CSS variables → VERIFY: check colors in browser]

### Phase 2: Modular Window System
- **Task 2: Build `ModularWindow` Component**
  - Create a reusable wrapper with absolute corner brackets and technical headers.
  - [INPUT: NEW ModularWindow.tsx → OUTPUT: working wrapper → VERIFY: render in AdminDashboard]

### Phase 3: High-Density UI Polish
- **Task 3: Redesign Financial Oracle (V2)**
  - Integrate layered hex-grid backgrounds and cyan telemetry data.
  - [INPUT: AdminDashboard.tsx → OUTPUT: overhauled hero → VERIFY: visual check against Iron Man reference]

## Phase X: Verification
- [ ] Run `python .agent/scripts/verify_all.py .`
- [ ] Build verification: `npm run build`
- [ ] UX Audit: `python .agent/skills/frontend-design/scripts/ux_audit.py`

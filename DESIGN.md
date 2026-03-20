# Design System: Multi-Spectral HUD v2
**Project ID:** 13761070101029583777

## 1. Visual Theme & Atmosphere
**Mood: Tactical Precision, High-Density, Modular Intel.**
The "Multi-Spectral HUD v2" is a cinematic, industrial-inspired interface designed for advanced monitoring and control. It utilizes a **Modular Window** approach, allowing a flexible but structured layout. Depth is achieved through glassmorphism, tonal layering, and animated atmospheric overlays (hex-grids, data streams). The interface feels like a "Tactical Command Center" from *Iron Man* or *Cyberpunk 2077*, optimized for premium SaaS workflows.

## 2. Multi-Spectral Color Palette & Semantic Roles
*   **Emerald (#10b981):** SUCCESS / HEALTH. Used for stable system states, cleared tasks, and growth metrics.
*   **Cyan (#00F0FF):** INTELLIGENCE / DATA. Used for informational streams, analytics, and primary tactical readouts.
*   **Amber (#FFB800):** WARNING / OPS. Used for pending actions, non-critical alerts, and operational cues.
*   **Red (#FF0000):** CRITICAL / DANGER. Reserved for security breaches, system failures, and immediate blockers.
*   **Deep Space (#0B0F19):** Surfaces and glass backgrounds.

## 3. Topography & Data Density
*   **font-technical (Space Grotesk):** Primary headers and labels. High-tech, geometric authority.
*   **font-data (JetBrains Mono):** Numerical values and telemetry logs.
*   **Layered Interactivity:** Use of `hud-hex-grid` and `hud-data-stream` overlays to create an "alive" feeling without distracting from core data.

## 4. Component Architecture
*   **Modular Windows:** Every dashboard section is wrapped in a `ModularWindow` component with draggable handles and semantic status markers.
*   **Glassmorphism:** All containers use `.hud-glass` with backdrop-blur and subtle borders.
*   **Micro-animations:** Hover glows (`hud-micro-glow`) and scanline triggers for interactive elements.

## 5. Layout Principles
*   **Semantic Borders:** Use `hud-border-*` utilities to quickly identify the status of a module.
*   **Asymmetry & Grid:** A balanced mix of wide analytics charts and dense sidebar diagnostics.
*   **Technical Integrity:** Every button, label, and metric must have a functional "feel"—no generic placeholders.


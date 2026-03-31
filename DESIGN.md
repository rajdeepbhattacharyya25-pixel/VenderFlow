# Design System: Forest Artisan v1
**Project ID:** 13761070101029583777

## 1. Visual Theme & Atmosphere
**Mood: Organic Elegance, premium Artisan, Deep Stability.**
The "Forest Artisan" design system represents a transition from tactical monitoring to high-end, biological commerce. It utilizes a **Serif-First** approach to evoke trust and heritage, grounded by deep organic tones. The interface feels like a "Boutique Digital Storefront"—minimalist, high-contrast, and focused on product storytelling.

## 2. Core Brand Palette & Semantic Roles
*   **Forest Dark Green (#093223):** BRAND PRIMARY / AUTHORITY. Used for primary buttons, headers, and landing page grounding.
*   **Emerald Green (#10b981):** BRAND ACCENT / GROWTH. Used for secondary highlights, success states, and metric trends.
*   **Almond / Bone (#F5F5DC):** LIGHT MODE BACKGROUND. (Proposed)
*   **Obsidian / Deep Space (#050505):** DARK MODE BACKGROUND.

## 3. Typography Standards
*   **Heading (Playfair Display):** All primary headers (h1, h2, h3). High-contrast serif for a premium, editorial feel. 
    - *Usage*: `.font-heading` or `var(--font-heading)`.
*   **Body (Inter):** All descriptive text and interface labels. Clean, high-readability sans-serif.
*   **Data (Monospace):** Numerical values and SKU telemetry.

## 4. Component Architecture
*   **Pill Styling:** Primary CTA buttons use `rounded-full` for a modern, approachable silhouette.
*   **Soft Elevation:** Components use deep, low-opacity shadows (e.g., `shadow-[0_20px_40px_-15px_rgba(9,50,35,0.3)]`) to simulate depth without harsh borders.
*   **Cinematic Overlays:** Use of the `OfflineOverlay` with physics-based swing mechanisms for unexpected, high-end "moments."

## 5. Layout Principles
*   **White Space:** Generous margins to allow products to "breathe."
*   **Interactive Polishing:** Hover effects should include subtle vertical translations and glow intensifications.
*   **Consistency:** Avoid hardcoded hex values; always reference `var(--color-brand-*)` or Tailwind theme tokens.

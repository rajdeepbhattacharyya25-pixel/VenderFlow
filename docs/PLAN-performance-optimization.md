# PLAN-performance-optimization.md

## Goal: Improve Lighthouse Scores (Mobile 22 -> 70+ | Desktop 58 -> 90+)

The primary bottlenecks identified are a massive monolithic JavaScript bundle, excessive render-blocking Google Font families, and heavy main-thread blocking from the WebGL fluid simulation (`LiquidEther`).

---

## Proposed Changes

### 1. Bundle Optimization (Vite & Rollup)

- **Problem**: Monolithic bundle containing Three.js, GSAP, Framer Motion, and Sentry.
- **Solution**: Implement manual chunk splitting in `vite.config.ts`.
- **Target Files**: [vite.config.ts](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/vite.config.ts)

### 2. Font & Resource Pruning

- **Problem**: 6 Google Font families loaded synchronously.
- **Solution**:
  - Reduce to 2 families: **Inter** (Text) and **Syne** (Brand).
  - Use `font-display: swap`.
  - Defer Telegram WebApp script.
- **Target Files**: [index.html](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/index.html)

### 3. WebGL "Mobile Lite" Mode

- **Problem**: `LiquidEther` (51KB component) runs 20-32 iterations per frame even on mobile.
- **Solution**:
  - In `LandingPage.tsx`, detect device type.
  - Pass reduced props to `LiquidEther` on mobile: `resolution: 0.2` (was 0.4), `iterationsPoisson: 10` (was 22), `iterationsViscous: 10` (was 24).
- **Target Files**: [LandingPage.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/pages/LandingPage.tsx)

### 4. Image Optimization

- **Problem**: JPEG favicons and large hero icons.
- **Solution**: Convert `logo.jpg` and `logo-maskable.jpg` to WebP.
- **Target Files**: [public/](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/public/)

---

## Verification Plan

### Automated Tests

- Run `python .agent/skills/performance-profiling/scripts/lighthouse_audit.py` to verify improvements.
- Check `bundle-analysis.html` to ensure chunks are properly split.

### Manual Verification

- Verify scrolling smoothness on mobile (320px simulator).
- Ensure no visual degradation from font pruning.

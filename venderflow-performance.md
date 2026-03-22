# Performance Optimization Plan (VenderFlow)

## Goal
Improve Lighthouse Performance score from 28 to 80+ by fixing TTFB, reducing JS execution time, and optimizing the critical rendering path.

## Tasks

### Phase 1: Infrastructure & Critical Path (TTFB/FCP)
- [ ] **Analyze TTFB Root Cause** → Verify: If any SSR calls or heavy `LandingPage` initializers exist.
- [ ] **Optimize Google Fonts** → Verify: `preconnect` + `preload` added to `index.html`.
- [ ] **Critical CSS Injection** → Verify: Above-the-fold styles inlined or using `media="print" onload="this.media='all'"`.

### Phase 2: JavaScript & Bundle Size (TBT/LCP)
- [ ] **Aggressive Code Splitting** → Verify: `vite.config.ts` has `manualChunks` for heavy libs.
- [ ] **Lazy Load Sentry** → Verify: Imported dynamically within `useEffect`.
- [ ] **Animation Audit** → Verify: `ParallaxSections.tsx` does not trigger forced reflows (`offsetWidth/height`).
- [ ] **Dynamic Section Loading** → Verify: Sub-components like `Ecosystem` wrap in `Suspense + lazy`.

### Phase 3: Assets & WebGL (LCP/Speed Index)
- [ ] **Mobile Lite Mode** → Verify: WebGL disabled/simplified on 320px-480px width.
- [ ] **WebP Migration** → Verify: All `public/*.png/jpg` converted to `.webp`.

## Done When
- [ ] LCP < 3s.
- [ ] TBT < 300ms.
- [ ] TTFB < 600ms (Vercel).
- [ ] Performance score > 70.

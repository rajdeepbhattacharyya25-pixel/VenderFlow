# Project Plan: Scroll-Driven Image Sequence Animation

## 1. Context & Objectives

The goal is to replace the "Engineered for Performance" section on the landing page with a scroll-driven image sequence animation using an HTML `<canvas>`. The animation consists of 192 frames (960x540) of a slow-motion explosion that progresses as the user scrolls down a tall section (e.g., `500vh`).

## 2. Requirements Analysis

- **Assets:** 192 frames located at `/public/frames/`. total ~7MB.
- **Performance:**
  - Smooth rendering via `requestAnimationFrame` and Canvas.
  - Lazy dynamic preloading (sparse initially, full first 20, +/- 8 dynamically).
  - `IntersectionObserver` to pause when out of view.
  - Async image decoding (`img.decode()`).
- **Responsive & Fallback:**
  - Retina display scaling (`devicePixelRatio`).
  - Mobile fallback handling (reduced preloads/size).
  - Support `prefers-reduced-motion` media queries.
- **Integration:** React component drop-in replacement for the identified landing page section.

## 3. Socratic Gate & Clarifications (Edge Cases)

Before we start coding, here are a few edge-case questions to consider during implementation:

1. **Layout Shift:** What should be displayed inside the `500vh` sticky section alongside the explosion? Just the explosion, or should text overlay it sequentially?
2. **Mobile Layout:** On low-power mobile devices, should we cap the frame rate or just rely on reduced preloading frames?
3. **Loading State:** Do we have a specific blurhash or placeholder image for frame 0, or should the canvas just stay blank until the first frame decode completes?

## 4. Task Breakdown

### Phase 1: Preloader Module (`utils/imagePreloader.ts`)

- [ ] Implement robust asynchronous image loader with `img.decode()`.
- [ ] Implement specific strategies:
  - Sparse loading (every 10th frame).
  - Initial batch (frames 1-20).
  - Dynamic proximity batch (current frame +/- 8).
  - Throttle queue for background completion.
- [ ] Error handling for missing frames.

### Phase 2: Canvas Animation Component (`components/ScrollImageSequence.tsx`)

- [ ] Scaffold React component with `canvas` and `500vh` sticky container.
- [ ] Add `IntersectionObserver` to disable `requestAnimationFrame` when out of viewport.
- [ ] Implement Scroll mapping: `(scrollTop - sectionOffset) / scrollHeight -> frameIndex`.
- [ ] Handle `devicePixelRatio` canvas resizing.

### Phase 3: Accessibility & Fallbacks

- [ ] Implement `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- [ ] If reduced motion is true, show static image `frame_0001` or play at low FPS automatically without scroll requirement.
- [ ] Apply `aria-hidden="true"` to canvas and add `.sr-only` descriptive text for screen readers.

### Phase 4: Integration

- [ ] Locate the "Engineered for Performance" section in `LandingPage.tsx`.
- [ ] Remove the old section (Edge Speed, Bulletproof, Deep Data).
- [ ] Insert `<ScrollImageSequence frameCount={192} framePath="/frames/frame_{index}.jpg" />`.
- [ ] Clean up unused CSS/imports from the removed section.

## 5. Agent Assignments

- **`project-planner`**: Analyzed requirements and defined this plan.
- **`frontend-specialist`** (Next steps): To write the React component snippet, the preloader logic, and replace the old section in `LandingPage.tsx`.

## 6. Verification Checklist

- [ ] Scroll maps exactly from frame 1 to 192 across the 500vh container.
- [ ] Network tab shows gradual/smart loading, not 192 simultaneous requests on page load.
- [ ] Canvas resizes correctly on window resize without stretching.
- [ ] No animation plays when out of view (`IntersectionObserver` active).
- [ ] Reduced motion prefers static image.

# UI/UX Transition Polish Plan

## 1. Context & Objectives

The user wants to elevate the landing page transitions to an "Apple" or "Stripe" level of polish, specifically addressing "blocky" transitions between the new Scroll-Driven Image Sequence and the surrounding sections (Ecosystem and FAQ).

## 2. Requirements Analysis

### 1. The "Cube" Reveal (Parallax & Scale)

- **Problem:** The image sequence currently just fades in.
- **Solution:** Tie the initial entry into the sequence to a GSAP ScrollTrigger. The canvas/container should start slightly smaller (e.g., `scale: 0.8`) and grow to `scale: 1` as the user crosses the threshold.

### 2. Sticky Section Overlays (Stacking)

- **Problem:** The transition out of the image sequence into the FAQ feels like a hard line.
- **Solution:** Make the image sequence (`ScrollImageSequence`) and surrounding sections sticky. As the user scrolls past the sequence, the next section (FAQ) should slide *over* the pinned canvas rather than pushing it up.

### 3. Content Staggering (FAQ)

- **Problem:** FAQ content all appears at once.
- **Solution:** Add `IntersectionObserver` or GSAP ScrollTrigger to the FAQ text blocks. They should start with `opacity: 0, y: 20` and stagger in with a `0.1s` delay when they enter the viewport.

### 4. The "Lime" Transition (Gradient/Liquify)

- **Problem:** The jump to the bright lime FAQ background is a jarring visual shift from pure black.
- **Solution:** Instead of a hard line, we will implement a transition area. This can be a smooth radial gradient overlay, or a pinned transition section that scales a lime circle up until it covers the screen before revealing the FAQ.

## 3. Implementation Steps

1. **Update `ScrollImageSequence.tsx`**
   - Refine the fade-in.
   - Add a GSAP hook for the "Cube Reveal" (scale from 0.8 -> 1 on entry).
   - Ensure the container uses `position: sticky` and appropriate `z-index` so subsequent sections can slide *over* it.

2. **Update `LandingPage.tsx` Layout Structure**
   - Review how `ScrollImageSequence` sits relative to the `FAQ` component.
   - Ensure the `FAQ` component (or its wrapper) is styled to slide over the pinned sequence (using relative positioning and z-indexes).

3. **Update `FAQ` Component**
   - Add GSAP/Framer Motion staggering logic to the question blocks.
   - Implement the "Lime Bleed" effect on the background.

## 4. Verification

- Verify the scale-in effect of the sequence canvas.
- Verify the sticky stacking effect (FAQ sliding over the sequence).
- Verify the FAQ text staggers smoothly in.
- Verify the background color transition is smooth, not a hard cut.

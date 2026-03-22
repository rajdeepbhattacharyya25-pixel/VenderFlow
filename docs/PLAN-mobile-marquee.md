# PLAN-mobile-marquee.md

## Goal
Enable the VENDORFLOW marquee crawl animation inside `FloatingCollage` on **mobile devices** (< 768px), matching the existing desktop behavior.

---

## Background

In `FloatingCollage.tsx`, GSAP's `matchMedia` pattern controls device-specific animations:

- **Desktop** (`min-width: 768px`): Initializes `crawl1` (row 1 → left) and `crawl2` (row 2 → right) continuous GSAP tweens, plus a scroll-velocity "flywheel" that speeds up the marquee when the user scrolls fast.
- **Mobile** (`max-width: 767px`): Only runs the card deck animations — **no marquee motion at all**. This is why the VENDORFLOW text appears static on mobile.

---

## Root Cause

```ts
mm.add("(min-width: 768px)", () => {
    // ✅ crawl1, crawl2, scroll-velocity sync — DESKTOP ONLY
});

mm.add("(max-width: 767px)", () => {
    // ❌ NO marquee here — gap!
});
```

---

## Proposed Changes

### `FloatingCollage.tsx` — Add marquee to mobile block

**Add inside `mm.add("(max-width: 767px)", ...)`:**

```ts
/* ═══ MARQUEE: Continuous crawl (mobile) ═══ */
const crawl1 = gsap.to(marqueeRow1Ref.current, {
    xPercent: -50,
    duration: 80,   // Slightly faster than desktop (120s) for mobile feel
    ease: 'none',
    repeat: -1,
});
const crawl2 = gsap.fromTo(marqueeRow2Ref.current, {
    xPercent: -50,
}, {
    xPercent: 0,
    duration: 80,
    ease: 'none',
    repeat: -1,
});

/* ═══ Scroll Indicator Pulsing ═══ */
gsap.to(scrollIndicatorRef.current, {
    opacity: 0.8,
    duration: 1.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut"
});

/* ═══ Velocity-sync Flywheel ═══ */
ScrollTrigger.create({
    trigger: containerRef.current,
    start: 'top top',
    end: '+=500%',
    onUpdate: (self) => {
        const velocity = Math.abs(self.getVelocity()) / 1000;
        const newSpeed = Math.max(1, 1 + velocity * 3);
        gsap.to([crawl1, crawl2], {
            timeScale: newSpeed,
            duration: 2.5,
            ease: 'power3.out',
            overwrite: true,
        });
    },
});
```

> ⚡ Duration is set to `80s` on mobile (vs `120s` desktop) so the text moves noticeably at a smaller viewport width where letter-spacing makes text appear slower.

---

## Files Modified

| File | Change |
|------|--------|
| `components/FloatingCollage.tsx` | Add marquee + scroll indicator + velocity sync to mobile matchMedia block |

---

## Verification

1. Open site on mobile (< 768px viewport)
2. Navigate to the FloatingCollage section (card deck)
3. Confirm VENDORFLOW rows crawl left/right continuously
4. Scroll fast → confirm text speeds up (velocity flywheel)
5. Desktop: verify no regression (still smooth at 120s duration)

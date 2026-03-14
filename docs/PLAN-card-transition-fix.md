# Plan for Fixing Card Transitions

## Context

The user identified two issues in the "5 Reasons Sellers Choose VendorFlow" section on the landing page (`components/WhyVendorflow.tsx`):

1. **First card fades away too quickly:** It fades out before it properly "comes up" (meaning before the user has time to absorb the newly revealed section).
2. **Excessive scrolling between cards:** The user has to scroll too much to trigger the card transitions.

## Proposed Changes

### `components/WhyVendorflow.tsx`

- **Adjust the Timeline Math (First Card Overlap)**: Change the initial GSAP `masterTl` timeline so the first card has a longer initial "hold" time before it starts an exit animation. For example, increase `startTime` offset so the exit starts later in the scrolling sequence, providing ample time for the initial reveal and reading.
- **Add Entrance Animation to First Card**: Currently, the first card has no initial scroll-triggered entrance animation, it's just static on load. I will add an intro animation (e.g., sliding up and fading in) for the first card to ensure it "comes up" properly in sync with the section header.
- **Reduce Scroll Friction (Height Adjustment)**: Lower the CSS `height` of the pinning section from `1000vh` to a more manageable value like `500vh` or `600vh`. This maps the same GSAP progress ratio to a shorter scroll distance, reducing the scroll effort required from the user to move between cards.

## Verification Plan

### Manual Verification

1. Start the UI with `npm run dev`.
2. Scroll down to the "5 Reasons Sellers Choose VendorFlow" section.
3. Observe the first card: verify it has a proper entrance animation and stays visible long enough before transitioning off.
4. Scroll through the remaining cards: confirm the amount of scroll required between each transition is comfortable and responsive.
5. Verify the pagination dots still correctly highlight the active card.

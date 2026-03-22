# Plan: Liquid Ether Auto-Animation & Logo Text

## Context Check
- **User Request**: Make the Liquid Ether animation start automatically (simulating interaction) every 2 seconds, and add the "VendorFlow" text next to the logo.
- **Constraints**: No code written during this phase. Planning only.

## Socratic Gate (Clarifying Questions)
Before implementation, please confirm:
1. **Liquid Ether Auto-Animation**: The Liquid Ether effect normally requires mouse movement to stir the fluid. Do you want it to artificially simulate a "swirl" every 2 seconds even if the user isn't touching the screen? (This can be done by programmatically injecting force coordinates).
2. **Logo Text Placement**: Do you want the text "VendorFlow" added next to the logo on just the Landing Page header, or across the entire platform (Admin Dashboard, Seller Storefront, etc.)?

## Task Breakdown

### Phase 1: Logo Text Update
- **Target**: `components/Navbar.tsx` (and potentially `LandingPage.tsx` logo anchor)
- **Action**: Add `<span className="font-bold text-lg tracking-wide">VendorFlow</span>` next to the `VF` SVG logo in the header.

### Phase 2: Liquid Ether Auto-Stir
- **Target**: `components/react-bits/LiquidEther.jsx` (or tsx)
- **Action**: Add a `setInterval` hook that programmatically triggers the fluid simulation's `pointermove` or `splat` logic at random or fixed coordinates every 2000ms if no real user interaction is detected.

## Next Steps
Please answer the Socratic Gate questions above. Once clarified, run `/create` or tell me to proceed with implementation!

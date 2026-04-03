# PLAN-rotation-simplify.md

## GOAL: Simplify Studio Editor Rotation
Consolidate the dual-button rotation controls into a single "90° Cycle" button while keeping the fine-tuning slider.

## User Review Required
- [x] Confirmed: Keep the rotation slider for fine-tuning.
- [x] Confirmed: Use a single clockwise cycling button (90 $\to$ 180 $\to$ 270/(-90) $\to$ 0).
- [x] Confirmed: Maintain light haptic pulses.

## Proposed Changes

### VenderFlow Studio Editor

#### [MODIFY] [ImageEditorModal.tsx](file:///c:/Users/ASUS/Downloads/e-commerce-landing-page/dashboard/components/products/ImageEditorModal.tsx)

1.  **Logic Update**:
    - Add `cycleRotation()` function to handle the 90° clockwise increment logic.
    - Ensure it maps correctly to the -180 to 180 range used by the slider.
    - Logic: `(prev + 90)`. If result > 180, subtract 360. If result == 360, reset to 0.

2.  **UI Refactoring**:
    - Remove the dual `RotateCcw` and `RotateCw` buttons in the bottom control layer.
    - Add a single, prominent `RotateCw` button in the center-right of the slider group.
    - Update the "Notch" indicator UI to better represent the current quadrant.

3.  **Haptics**:
    - Trigger `navigator.vibrate(10)` on every tap of the cycle button.

---

## Verification Plan

### Manual Verification
- Tap the rotation button 4 times to ensure it returns to 0°.
- Use the slider to set a "tilt" (e.g., 5°) and then tap the rotation button. Verify it moves to 95°.
- Check haptic feedback on mobile hardware.

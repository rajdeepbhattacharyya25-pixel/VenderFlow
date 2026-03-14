# Overview

The user requested a modification to the `LiquidEther` effect on the landing page. Currently, the effect produces smoke trails via a hovering cursor. In the absence of user interaction, an automatic demo mode creates trails, but they wander aimlessly. The goal is to update the auto-demo generation so that smoke trails are generated in a random direction traversing from one end to the other end automatically every 3 seconds.

## Project Type

WEB

## Success Criteria

- When auto-demo is active in `LiquidEther`, the trail starts from one edge of the container and travels to another edge.
- The auto-demo trail sequence repeats/generates a new path automatically every 3 seconds.
- The existing user interactability (hovering the surface) remains entirely functional and responsive.

## Tech Stack

- React, TypeScript
- THREE.js / WebGL (via raw shader material passes)

## File Structure

- `components/react-bits/LiquidEther.tsx`: Contains the `AutoDriver` class which controls the auto-demo pathing. No new files required.

## Task Breakdown

### Task 1: Modify AutoDriver logic

- **task_id**: update_auto_driver
- **name**: Refactor edge-to-edge path generation every 3s
- **agent**: frontend-specialist
- **priority**: P1
- **dependencies**: none
- **INPUT**: `components/react-bits/LiquidEther.tsx` (Specifically the `AutoDriver` class and `pickNewTarget` method).
- **OUTPUT**: Updated `AutoDriver` that implements:
  1. A 3-second cycle interval for picking new paths.
  2. A new `pickNewTarget` logic that selects a starting position on one edge (`x=-1|1` or `y=-1|1`) and a destination on another edge.
  3. Logic to reset `this.current` to the new edge start position and smoothly travel to `this.target`.
- **VERIFY**: Open the landing page, wait for the auto demo to take over, and visually confirm the trail starts on an edge, moves across the screen, and restarts after 3 seconds.

## Phase X: Verification

- [ ] Code properly lints (`npm run lint` or `npx eslint .`)
- [ ] No regression on cursor interactive mode (takeover logic works correctly).
- [ ] Build succeeds (`npm run build`).
- [ ] Visual QA verifies smooth animation matching the "every 3 seconds from end to end" requirement.

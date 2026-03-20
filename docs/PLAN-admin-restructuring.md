# Platform Admin Dashboard Restructure Plan

Reorganize the admin interface to reduce cognitive load while ensuring primary features are immediately accessible.

## Core Objectives

- **Mission Control Focus**: Prioritize real-time data and mission-critical operations.
- **Cinematic HUD Aesthetic**: Move away from generic dashboard grids to a high-density, technical, glassmorphic UI.
- **Functional Hierarchy**: Group features by usage (80% vs 20%).

## Phase 1: Structural Overhaul

### [MODIFY] AdminLayout.tsx

- Simplify sidebar to mission-critical modules.
- Move primary navigation to top-level icons or groups.

### [MODIFY] AdminDashboard.tsx

- Remove generic stats cards.
- Implement "Financial Oracle" (Large glassmorphism hero module).
- Enforce 0px corners and professional brutalism HUD styles.
- Add Emerald/Amber glowing edges and "Bracket" styles.
- Integrate "Status Scanlines" overlay for hardware feel.

## Phase 2: Feature Re-nesting

### 1. Operations & Logistics

- Orders & Fulfillment (Unified Command).
- Merchant Node Management.
- Serviceability Matrix.

### 2. Market Intelligence

- Financial Stream (GMV, Payouts, Commissions).
- AI Oracle Insights (Health & Projections).

## Phase 3: Persistent HUD Layer

- Top Bar (Global Alerts, Node Latency, Broadcast).
- Right Panel (Critical Logs, System Pulse).

## Implementation Checklist

- [x] Create `DESIGN.md` for HUD tokens.
- [x] Define utility classes in `index.css`.
- [x] Refactor `AdminDashboard.tsx` layout.
- [x] Restyle `AnnouncementModal`.
- [x] Final Audit & Verification.
- [ ] Verify sidebar groups work correctly.
- [ ] Verify search (CMD+K) still navigates correctly to all features.
- [ ] Verify responsiveness on desktop and mobile.

## ✅ PHASE X COMPLETE

- **Lint**: [ ]
- **Security**: [ ]
- **Build**: [ ]
- **Date**: [ ]


# Task 4 Report: Full-Screen Follow, Pounce, Separation, and Hit Targets

## Summary

Implemented Task 4 in the owned files only. Follow mode now assigns each companion a cursor-relative slot across the full screen, pets move in 2D toward those slots, cats can stalk/pounce around their assigned slot, overlapping companions are separated after follow updates, overlay hit testing supports padding, and the smallest icon/button hit targets were expanded to 40px.

## What Changed

### `src/behaviorEngine.ts`

- Extended `FollowContext` with optional `targetIndex`.
- Added `FOLLOW_SLOTS` plus exported `getFollowTarget(...)` to compute per-pet slot positions around the cursor with bounds clamping.
- Updated follow behavior to:
  - move in both X and Y toward the assigned slot,
  - use slot Y for `stalk`, `pounce`, and `watch`,
  - preserve stalk/pounce behavior for cats when the cursor idles near the slot.
- Added exported `separateOverlaps(...)` to push overlapping companions apart while keeping them inside the stage bounds.

### `src/overlay/useCompanionSimulation.ts`

- Assigned each companion a stable `targetIndex` while follow mode is active.
- Applied `separateOverlaps(...)` after advancing companions during follow mode.

### `src/overlay/hitTest.ts`

- Extended `findPetAtPoint(...)` to accept an optional `padding` argument for enlarged hit detection.

### `src/Overlay.tsx`

- Updated pointer hover detection to call `findPetAtPoint(...)` with `14px` padding.

### `src/styles.css`

- Increased `.icon-button` to `40x40`.
- Increased `.tab-button` to `min-height: 40px`.
- Increased `.check-button` and `.trash-button` to `40x40` with `min-height: 40px`.

### Tests

#### `src/behaviorEngine.test.ts`

- Added tests covering:
  - separate follow slots,
  - 2D follow movement,
  - overlap separation,
  - pounce activation near an assigned slot.
- Updated older follow-mode assertions to target slot-based destinations instead of the raw cursor center.

#### `src/overlay/hitTest.test.ts`

- Added coverage for padded hit boxes.

## TDD Evidence

### RED

Command run:

```bash
npx vitest run src/behaviorEngine.test.ts src/overlay/hitTest.test.ts
```

Observed failures before implementation:

- `getFollowTarget is not a function`
- `separateOverlaps is not a function`
- padded hit-box test returned `null` instead of `"martyn"`

### GREEN

Command run again after implementation:

```bash
npx vitest run src/behaviorEngine.test.ts src/overlay/hitTest.test.ts
```

Result:

- `2` test files passed
- `35` tests passed
- exit code `0`

## Files Changed

- `src/behaviorEngine.ts`
- `src/behaviorEngine.test.ts`
- `src/overlay/useCompanionSimulation.ts`
- `src/overlay/hitTest.ts`
- `src/overlay/hitTest.test.ts`
- `src/Overlay.tsx`
- `src/styles.css`

## Self-Review

- Scope stayed inside the owned Task 4 files.
- I did not revert or modify companion UI/timer/tool work outside this task.
- Follow-mode tests now reflect the slot-based behavior introduced by the brief.
- Focused verification passed, though the Vitest run still emits existing Vite/esbuild deprecation warnings unrelated to this task.

# Task 3 Report: Timer Actions and Tool Pop-Out Panels

## Summary

Implemented Task 3 by extracting timer controls into a shared `TimerTool`, adding floating `ToolPopout` panels, extending `ToolDrawer` with pop-out actions and timer minute controls, wiring timer duration and pop-out state in `App.tsx`, and adding the required CSS for stable timer controls and floating tool surfaces.

## What Changed

- Created `src/components/TimerTool.tsx` for the shared timer UI, including:
  - formatted timer display
  - start/pause and reset actions
  - bounded minute decrement/increment controls
  - bounded numeric minute input
- Created `src/components/ToolPopout.tsx` for floating tool panels with a title bar and close action.
- Updated `src/components/ToolDrawer.tsx` to:
  - accept `poppedTools`, `onPopTool`, `timerMinutes`, and `onTimerMinutesChange`
  - render pop-out buttons for Notes, Tasks, and Timer
  - use `TimerTool` instead of inline timer markup
- Updated `src/App.tsx` to:
  - track `timerMinutes`
  - track `poppedTools`
  - support opening and closing tool pop-outs
  - reset the timer using the selected minute value
  - stop and resync the timer when duration changes
  - render pop-out versions of Notes, Tasks, and Timer using shared state
- Updated `src/styles.css` to add:
  - pop-out button styling
  - floating pop-out panel styling
  - reliable timer duration control styling
  - timer action button styling
  - tab layout support for tab + pop-out button pairs

## Files Changed

- `src/components/ToolDrawer.tsx`
- `src/components/ToolDrawer.test.tsx`
- `src/components/TimerTool.tsx`
- `src/components/TimerTool.test.tsx`
- `src/components/ToolPopout.tsx`
- `src/components/ToolPopout.test.tsx`
- `src/App.tsx`
- `src/styles.css`

## TDD Evidence

### RED

Added the required tests first:

- `src/components/TimerTool.test.tsx`
- `src/components/ToolPopout.test.tsx`
- updated `src/components/ToolDrawer.test.tsx`

Ran:

```bash
npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx
```

Observed failure evidence:

- `TimerTool.test.tsx` failed because `./TimerTool` did not exist
- `ToolPopout.test.tsx` failed because `./ToolPopout` did not exist
- `ToolDrawer.test.tsx` failed because `Pop out Notes`, `Pop out Tasks`, and `Pop out Timer` were not rendered

### GREEN

Implemented the production changes, then re-ran:

```bash
npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx
```

Result:

- 3 test files passed
- 6 tests passed
- exit code 0

## Verification

Focused task tests:

```bash
npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx
```

Result: PASS

Build verification:

```bash
npm run build
```

Result: PASS (`tsc --noEmit` and `vite build`)

## Self-Review

- The timer duration now drives reset behavior and progress calculation consistently.
- Pop-out state is deduplicated so the same tool is not opened twice.
- The pop-out timer reuses the shared `TimerTool` component, keeping timer UI behavior aligned between the drawer and floating panel.
- Notes and tasks pop-outs intentionally reuse the same live state as the drawer so edits stay synchronized.
- Focused tests and a full build both passed after implementation.

## Concerns

- The focused tests required by the brief cover markup presence and shared component rendering, but not interactive browser behavior. I added a build verification pass to reduce risk.

## Fix Follow-Up

### Review Findings Addressed

- Fixed `timerProgress` so it now uses the selected timer duration instead of a hardcoded 25-minute denominator.
- Added regression coverage for timer progress synchronization by introducing a shared `getTimerProgress(timerSeconds, timerMinutes)` helper and testing:
  - a 50-minute timer at 50:00 starts at `0`
  - a 50-minute timer at 25:00 reports `0.5`

### RED

Updated `src/components/TimerTool.test.tsx` first with the new regression assertions, then ran:

```bash
npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx
```

Observed failure evidence:

- `TimerTool.test.tsx` failed with `TypeError: getTimerProgress is not a function`

### GREEN

Implemented `getTimerProgress` in `src/components/TimerTool.tsx` and switched `src/App.tsx` to use it for `timerProgress`.

Re-ran:

```bash
npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx
```

Result:

- 3 test files passed
- 7 tests passed
- exit code 0

Additional verification:

```bash
npm run build
```

Result: PASS (`tsc --noEmit` and `vite build`)

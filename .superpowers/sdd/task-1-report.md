# Task 1 Report: Companion Defaults and State Helpers

## Status

DONE

## What Changed

- Updated authored defaults in `src/data.ts` so Martyn and Charles are editable built-ins with the brief's `locked`, `speed`, and `energy` values.
- Reworked companion normalization in `src/companionState.ts` to merge stored editable fields onto authored defaults while restoring authored identity fields such as `id`, `species`, `kind`, `avatar`, and `pattern`.
- Added `updateCompanionsByIds(...)` for multi-selection edits and `getSharedNumberValue(...)` for shared-or-mixed numeric state checks.
- Replaced overlapping companion state tests in `src/companionState.test.ts` with the task's requested coverage.

## TDD Evidence

### RED

Command:

```bash
npx vitest run src/companionState.test.ts
```

Result:

- Failed 5 of 6 tests.
- Failures matched the brief:
  - `updateCompanionsByIds` missing
  - `getSharedNumberValue` missing
  - authored companions still had `locked: true`
  - normalization did not preserve editable stored fields
  - Martyn/Charles authored defaults did not match required speed and energy values

### GREEN

Command:

```bash
npx vitest run src/companionState.test.ts
```

Result:

- Passed 6 of 6 tests.
- Vitest completed successfully for the focused task suite.

## Test Results

- `npx vitest run src/companionState.test.ts` - PASS

## Files Changed

- `D:\Projects\Pet Engine\src\data.ts`
- `D:\Projects\Pet Engine\src\companionState.ts`
- `D:\Projects\Pet Engine\src\companionState.test.ts`
- `D:\Projects\Pet Engine\.superpowers\sdd\task-1-report.md`

## Self-Review

- Kept changes scoped to the owned files plus the requested report file.
- Followed the brief literally, including helper signatures and the focused test command.
- Left unrelated untracked brief files untouched.
- The focused tests pass; the only remaining noise is existing Vite deprecation warnings during the test run, which did not affect task behavior.

## Fixes After Review

### Review Findings Addressed

- Updated `findSelectedCompanion(...)` so the final fallback is now a restorable built-in companion: first custom companion, then the first companion in the list if needed.
- Restored coverage for legacy/junk normalization input.
- Restored and strengthened the no-summoned fallback-path coverage so hiding every companion still leaves a selectable built-in companion.
- Removed the explicit `locked: false` override in `mergeStoredCompanion(...)` and now rely on authored defaults from the base clone, which still normalize built-ins as unlocked.

### Fix TDD Evidence

#### RED

Command:

```bash
npx vitest run src/companionState.test.ts
```

Result:

- Failed 1 of 8 tests.
- Failure matched the review finding: when every companion was hidden, `findSelectedCompanion(...)` returned `undefined` instead of a restorable built-in companion.

#### GREEN

Command:

```bash
npx vitest run src/companionState.test.ts
```

Result:

- Passed 8 of 8 tests.
- Focused task suite completed successfully after the fallback fix.

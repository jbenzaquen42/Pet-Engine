# Free-Roam Phase 4: Fun Behaviors — Implementation Plan

> **For agentic workers:** Pure engine logic is TDD'd; overlay/prop wiring is build + preview verified. `npm test` does NOT type-check — always run `npm run build`.

**Goal:** Add the personality layer: grab & toss physics, zoomies, Martyn↔Charles interactions, click reactions, the Charles fountain, and cat edge-climb/perch.

**Architecture:** New behaviors extend `advanceCompanion` (still pure). Runtime gains `vx` and `rotation` for tumbling. Pet-to-pet awareness is a pre-pass over all runtimes. The fountain is an overlay prop whose position lives in `EngineSettings`; a pure scheduler sends Charles to `drink`. Click reactions are transient behaviors set from the overlay.

**Spec:** `docs/superpowers/specs/2026-07-07-free-roam-desktop-companions-design.md` (Movement + physics, pet-to-pet, click reactions, Charles fountain, edge climb).

---

## Task Completion Checklist

- [x] Task 1: Runtime `vx`/`rotation` + grab-toss tumble physics (TDD)
- [x] Task 2: Zoomies sprint (TDD)
- [x] Task 3: Pet-to-pet interactions — greet, nap-together, chase (TDD)
- [x] Task 4: Click + double-click reactions (overlay + poses)
- [x] Task 5: Charles fountain prop + drink behavior
- [x] Task 6: Cat edge climb + perch (TDD + poses)

All engine logic unit-tested (57 tests). Live in-app feel (toss arc, zoomies, climb, fountain drink, reactions) pending user confirmation in the running Electron app after a restart.

---

## File Structure

- Modify `src/types.ts` — add `zoomies`, `climb`, `perch`, `drink`, `greet`, `react` to `Behavior`; add `vx?`, `rotation?` to `PetRuntime`; add `fountain: { enabled: boolean; x: number }` to `EngineSettings`.
- Modify `src/data.ts` — default `fountain: { enabled: true, x: 0.7 }` (x as fraction of width).
- Modify `src/behaviorEngine.ts` — tumble physics in `fall`/new `toss`; zoomies trigger + run; `applyNeighbors(runtimes, pets, bounds, now, random)` pre-pass; climb/perch; drink target helper `getFountainX(settings, width)`.
- Modify `src/behaviorEngine.test.ts` — tumble landing, zoomies trigger, neighbor greet/nap, climb transition, drink scheduling.
- Modify `src/overlay/useCompanionSimulation.ts` — throw velocity on release; run `applyNeighbors` each tick; expose `react(id, kind)`.
- Modify `src/Overlay.tsx` — compute throw velocity from pointer samples; click/double-click → `react`; render the fountain prop (draggable) and pass its x into the sim; apply `rotation` in the transform.
- Create `src/avatars/Fountain.tsx` — the fountain prop SVG.
- Modify `src/PetAvatar.tsx` / `src/avatars/CatWalkRig.tsx` / front stickers — `react` (hearts/happy), `drink` (head down), `climb`/`perch` poses.
- Modify `src/styles.css` — reaction hearts, drink, climb/perch, tumble.
- Modify `src/components/CommandBar.tsx` — fountain show/hide toggle.

---

### Task 1: Runtime vx/rotation + grab-toss tumble (TDD)

**Files:** `src/types.ts`, `src/behaviorEngine.ts`, `src/behaviorEngine.test.ts`, `src/overlay/useCompanionSimulation.ts`, `src/Overlay.tsx`, `src/styles.css`.

- Add `vx?: number; rotation?: number;` to `PetRuntime`; add `"toss"` to `Behavior`.
- `commandRuntime`/drag release: when released with speed, set `behavior: "toss"`, `vx`, `vy` from throw, `rotation` seed.
- In `advanceCompanion`, handle `toss`: integrate `x += vx`, `vy += gravity`, `y += vy`, `rotation += vx*k`; bounce off side walls (`vx *= -0.6`) and clamp; on landing (`y >= ground`) settle to `idle` with a brief squash, `vx=0`, `rotation=0`.
- Test: a tossed pet with vx>0, vy<0 moves right and, after enough steps at/under ground, lands `idle` with `rotation` reset.
- Overlay `endDrag`: sample last two pointer positions/time to compute velocity; call a new hook `release(vx, vy)`. Apply `rotation` in the button transform (`rotate(${rotation}deg)`).

### Task 2: Zoomies sprint (TDD)

- Add `"zoomies"` behavior. In `advanceCompanion` idle/walk branches: rare weighted trigger (scaled by `pet.energy`) → `zoomies`, pick a target edge. Zoomies moves at ~2.4× walk speed toward the target x; on reaching an edge, skid → `sit` briefly → `idle`.
- Route `zoomies` to `CatWalkRig` (cats) via `LOCOMOTION`; catalog pets use the walk-body class. CSS `pose-zoomies` = very fast `cat-step` + slight forward lean.
- Test: an idle pet with the RNG forced into the zoomies window becomes `zoomies`; a `zoomies` pet moves faster than a `walk` pet over one tick.

### Task 3: Pet-to-pet interactions (TDD)

- `applyNeighbors(runtimes, pets, bounds, now, random)`: for summoned custom cats within a small x-distance while both idle/sit, with cooldown (via `lastInteractionAt`), occasionally set one to `greet` (turn to face the other) or both to `sleep` (nap together). Rare: one to `chase` toward the other, other flees (`zoomies` away).
- Runs in the overlay tick before `advanceCompanion`, or folded in. Keep it a pure function returning new runtimes.
- Test: two cats placed adjacent and idle, RNG forced, produces a `greet`/`sleep`/`chase` pairing; far-apart cats are unchanged.

### Task 4: Click + double-click reactions

- Overlay: `onClick` a pet → `react` (single) ; double-click → per-pet special (`react` variant). Track click timing in the overlay; call hook `react(id, kind)` which sets a transient behavior with `stateStartedAt`; engine returns to prior/idle after ~800ms.
- Poses: `react` shows a happy pose + CSS heart particles (`.pet-hearts`). Martyn special = slow blink; Charles special = roll (front-sticker variant).
- Guard: a click that starts a drag should not also fire a reaction (use a movement threshold).

### Task 5: Charles fountain prop + drink

- `Fountain.tsx`: small sticker water fountain. Rendered on the overlay at `settings.fountain.x * width`, draggable (updates `fountain.x` via the panel snapshot round-trip; overlay sends a `command`-like `fountain:set` or reuses snapshot — simplest: overlay keeps local fountain x seeded from settings and the panel toggle only enables/disables).
- Engine: a scheduler gives Charles a periodic `drink` — when idle and fountain enabled, chance to walk to `getFountainX` then `drink` (head-down loop) for a few seconds. Martyn ignores it (`pet.avatar === "charles"`).
- CommandBar: fountain show/hide toggle bound to `settings.fountain.enabled`.
- Test: Charles idle near the fountain with RNG forced schedules `drink`; Martyn never does.

### Task 6: Cat edge climb + perch (TDD)

- Behaviors `climb`, `perch`. When a cat is walking near a side edge (x within ~24px of 8 or maxX), small chance → `climb`: y decreases up the edge to a perch height; then `perch` for a while; then `fall` down (existing physics) → land.
- Poses: `climb` = vertical cling (rig rotated), `perch` = sit at top.
- Test: a walking cat pinned to the left edge with RNG forced enters `climb`; `climb` decreases y until perch height then becomes `perch`.
```

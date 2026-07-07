# Free-Roam Phase 3: Follow Mode, Cursor Pump, and Pounce — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / executing-plans. Pure logic is TDD'd; Electron/IPC wiring is build + manual verified. `npm test` does NOT type-check — always run `npm run build`.

**Goal:** Add a follow toggle so all summoned pets walk to the cursor and watch it; give cats a stalk→pounce when the cursor sits still; re-wire the panel's behavior/call/reset commands to the roaming overlay over IPC.

**Architecture:** Follow is a pure extension to `advanceCompanion`: the overlay passes a `FollowContext` (active, pounce, cursor position, cursor-idle time) built from a main-process cursor pump. The panel owns `followMode`/`pounce` in `EngineSettings` (broadcast in the snapshot and mirrored to a tray checkbox), and tells main when to run the pump. Panel commands become IPC messages the overlay applies via `commandRuntime`.

**Tech Stack:** Electron 32, React 18, TS, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-07-free-roam-desktop-companions-design.md` (Follow mode).

---

## Task Completion Checklist

- [x] Task 1: Behavior/settings types + follow & pounce engine logic (TDD)
- [x] Task 2: Cursor pump + follow IPC (main, preload, types)
- [x] Task 3: Overlay threads cursor + follow into the simulation
- [x] Task 4: Panel follow/pounce toggles + tray sync + command re-wire
- [x] Task 5: Stalk/pounce/chase rig poses — rendered/verified; live follow behavior pending user confirmation in the running app

---

## File Structure

- Modify `src/types.ts` — add `chase`, `stalk`, `pounce` to `Behavior`; add `followMode`, `pounce` to `EngineSettings`.
- Modify `src/data.ts` — default `followMode: false`, `pounce: true` in `initialSettings`.
- Modify `src/behaviorEngine.ts` — `FollowContext` type; extend `advanceCompanion(..., follow?)` with follow-toward-cursor, arrival watch, and cat stalk→pounce.
- Modify `src/behaviorEngine.test.ts` — follow move, arrival, and pounce state-machine tests.
- Modify `src/overlay/useCompanionSimulation.ts` — accept `getFollow: () => FollowContext`, pass into `advanceCompanion`.
- Modify `src/Overlay.tsx` — receive cursor via `onCursor`, track cursor-idle time, build `FollowContext` from snapshot settings.
- Modify `electron/main.cjs` — cursor pump (`screen.getCursorScreenPoint`, ~30 Hz, overlay-relative) gated by follow state; `follow:set` handler; `command:push` relay.
- Modify `electron/preload.cjs` — `onCursor`, `setFollow`, `pushCommand`, `onCommand`.
- Modify `src/vite-env.d.ts` — new bridge methods.
- Modify `src/App.tsx` — follow/pounce settings, tray sync already via `onTrayToggleFollow`, wire `CommandBar` onCommand/onCall/onReset to `pushCommand`; call `setFollow` when `followMode` changes.
- Modify `src/components/CommandBar.tsx` — follow + pounce toggles.
- Modify `src/PetAvatar.tsx` / `src/avatars/CatWalkRig.tsx` + `src/styles.css` — `chase` uses the rig (faster cycle); `stalk` crouch and `pounce` leap poses.

---

### Task 1: Behavior/settings types + follow & pounce engine logic (TDD)

**Files:** Modify `src/types.ts`, `src/data.ts`, `src/behaviorEngine.ts`, `src/behaviorEngine.test.ts`.

- [ ] **Step 1: Extend types.** In `src/types.ts` change the `Behavior` union to:

```ts
export type Behavior =
  | "idle" | "walk" | "sit" | "sleep" | "stretch" | "watch"
  | "jump" | "fall" | "drag" | "chase" | "stalk" | "pounce";
```

Add to `EngineSettings`:

```ts
  followMode: boolean;
  pounce: boolean;
```

- [ ] **Step 2: Defaults.** In `src/data.ts` `initialSettings`, add `followMode: false,` and `pounce: true,`.

- [ ] **Step 3: Write failing engine tests.** Append to `src/behaviorEngine.test.ts`:

```ts
import type { FollowContext } from "./behaviorEngine";

const noFollow: FollowContext = { active: false, pounce: false, cursor: null, cursorIdleMs: 0 };

describe("follow mode", () => {
  it("walks toward a far cursor and faces it", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { x: 100, behavior: "idle" }),
      charles, initialSettings, bounds, 16.67, 1000, () => 0.5,
      { active: true, pounce: false, cursor: { x: 700, y: 300 }, cursorIdleMs: 0 }
    );
    expect(next.x).toBeGreaterThan(100);
    expect(next.direction).toBe(1);
    expect(["walk", "chase"]).toContain(next.behavior);
  });

  it("watches the cursor once it has arrived", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { x: 300, behavior: "walk" }),
      charles, initialSettings, bounds, 16.67, 1000, () => 0.5,
      { active: true, pounce: false, cursor: { x: 320, y: 300 }, cursorIdleMs: 0 }
    );
    expect(next.behavior).toBe("watch");
  });

  it("makes a cat stalk then pounce when the cursor sits still nearby", () => {
    const arrived = runtimeFor("martyn", { x: 300, behavior: "watch", stateStartedAt: 0 });
    const follow: FollowContext = { active: true, pounce: true, cursor: { x: 320, y: 300 }, cursorIdleMs: 1600 };
    const stalking = advanceCompanion(arrived, martyn, initialSettings, bounds, 16.67, 100, () => 0.5, follow);
    expect(stalking.behavior).toBe("stalk");
    const pouncing = advanceCompanion(
      { ...stalking, stateStartedAt: 0 }, martyn, initialSettings, bounds, 16.67, 700, () => 0.5, follow
    );
    expect(pouncing.behavior).toBe("pounce");
  });

  it("ignores follow while being dragged", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { behavior: "drag" }), charles, initialSettings, bounds, 16.67, 1000, () => 0.5,
      { active: true, pounce: true, cursor: { x: 700, y: 300 }, cursorIdleMs: 5000 }
    );
    expect(next.behavior).toBe("drag");
  });
});
```

- [ ] **Step 4: Run — expect FAIL** (`npm test -- src/behaviorEngine.test.ts`).

- [ ] **Step 5: Implement follow in `src/behaviorEngine.ts`.** Add the type and a helper, and branch at the top of `advanceCompanion` (after the `drag` guard) when follow is active:

```ts
export interface FollowContext {
  active: boolean;
  pounce: boolean;
  cursor: { x: number; y: number } | null;
  cursorIdleMs: number;
}

const IDLE_FOLLOW: FollowContext = { active: false, pounce: false, cursor: null, cursorIdleMs: 0 };
```

Change the signature to add `follow: FollowContext = IDLE_FOLLOW` as the last parameter. After the `if (next.behavior === "drag") return next;` guard and the physics/jump/fall guards for airborne states (`jump`, `fall`), insert:

```ts
  if (follow.active && follow.cursor && next.behavior !== "jump" && next.behavior !== "fall") {
    return applyFollow(next, pet, settings, bounds, delta, now, follow, ground, maxX, size);
  }
```

Add the pure helper:

```ts
function applyFollow(
  next: PetRuntime, pet: PetProfile, settings: EngineSettings, bounds: StageBounds,
  delta: number, now: number, follow: FollowContext, ground: number, maxX: number, size: number
): PetRuntime {
  const cursor = follow.cursor!;
  const target = clamp(cursor.x - size / 2, 8, maxX);
  const dx = target - next.x;
  const dist = Math.abs(dx);
  const arrive = Math.max(28, size * 0.5);
  const canPounce = follow.pounce && pet.species === "cat";
  const elapsed = now - next.stateStartedAt;

  // Pounce state machine takes over once arrived and the cursor is still.
  if (next.behavior === "stalk") {
    if (elapsed > 620) {
      return { ...next, y: ground, behavior: "pounce", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }
  if (next.behavior === "pounce") {
    const progress = Math.min(1, elapsed / 380);
    const y = ground - Math.sin(progress * Math.PI) * (34 + pet.energy * 26);
    const x = clamp(next.x + dx * 0.16, 8, maxX);
    if (progress >= 1) {
      return { ...next, x, y: ground, behavior: "watch", stateStartedAt: now };
    }
    return { ...next, x, y };
  }

  if (dist > arrive) {
    const step = Math.min(dist, (0.9 + pet.speed * 1.3) * settings.globalSpeed * (delta / 16.67));
    const direction = dx >= 0 ? 1 : -1;
    const behavior: Behavior = dist > 320 ? "chase" : "walk";
    const started = next.behavior === behavior ? next.stateStartedAt : now;
    return { ...next, x: clamp(next.x + step * direction, 8, maxX), y: ground, direction, behavior, stateStartedAt: started };
  }

  // Arrived: face the cursor. Cats pounce when the cursor has been still a beat.
  const direction = dx >= 0 ? 1 : -1;
  if (canPounce && follow.cursorIdleMs > 1400) {
    return { ...next, y: ground, direction, behavior: "stalk", stateStartedAt: now };
  }
  return { ...next, y: ground, direction, behavior: "watch", stateStartedAt: next.behavior === "watch" ? next.stateStartedAt : now };
}
```

- [ ] **Step 6:** `npm test -- src/behaviorEngine.test.ts` (PASS), then `npm test` + `npm run build` (PASS). Fix `normalizeSettings`/`normalizeSnapshot` only if types require (defaults spread already covers new fields).

- [ ] **Step 7: Commit** — `git add src/types.ts src/data.ts src/behaviorEngine.ts src/behaviorEngine.test.ts && git commit -m "feat: add follow-cursor and pounce behavior logic"`.

---

### Task 2: Cursor pump + follow IPC (main, preload, types)

**Files:** Modify `electron/main.cjs`, `electron/preload.cjs`, `src/vite-env.d.ts`.

- [ ] **Step 1:** In `electron/main.cjs`, add a pump that runs only while follow is on:

```js
let cursorTimer = null;
function startCursorPump() {
  if (cursorTimer) return;
  cursorTimer = setInterval(() => {
    if (!overlayWindow) return;
    const point = screen.getCursorScreenPoint();
    const bounds = overlayWindow.getBounds();
    overlayWindow.webContents.send("cursor:update", { x: point.x - bounds.x, y: point.y - bounds.y });
  }, 33);
}
function stopCursorPump() {
  if (cursorTimer) { clearInterval(cursorTimer); cursorTimer = null; }
  overlayWindow?.webContents.send("cursor:update", null);
}
ipcMain.on("follow:set", (_event, active) => {
  if (active) startCursorPump(); else stopCursorPump();
});
ipcMain.on("command:push", (_event, command) => {
  overlayWindow?.webContents.send("command:apply", command);
});
```

Also `clearInterval(cursorTimer)` in `will-quit` cleanup.

- [ ] **Step 2:** In `electron/preload.cjs`, add to the `petEngine` object:

```js
  setFollow: (active) => ipcRenderer.send("follow:set", active),
  onCursor: (callback) => {
    const listener = (_event, point) => callback(point);
    ipcRenderer.on("cursor:update", listener);
    return () => ipcRenderer.removeListener("cursor:update", listener);
  },
  pushCommand: (command) => ipcRenderer.send("command:push", command),
  onCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("command:apply", listener);
    return () => ipcRenderer.removeListener("command:apply", listener);
  },
```

- [ ] **Step 3:** In `src/vite-env.d.ts`, add to the `petEngine` type:

```ts
      setFollow: (active: boolean) => void;
      onCursor: (callback: (point: { x: number; y: number } | null) => void) => () => void;
      pushCommand: (command: { behavior: string; target: "selected" | "all"; id?: string }) => void;
      onCommand: (callback: (command: { behavior: string; target: "selected" | "all"; id?: string }) => void) => () => void;
```

- [ ] **Step 4:** `npm run build` (PASS — App.tsx/Overlay.tsx not yet using these is fine; optional methods). Commit — `git add electron/main.cjs electron/preload.cjs src/vite-env.d.ts && git commit -m "feat: add cursor pump and command relay IPC"`.

---

### Task 3: Overlay threads cursor + follow into the simulation

**Files:** Modify `src/overlay/useCompanionSimulation.ts`, `src/Overlay.tsx`.

- [ ] **Step 1:** In `useCompanionSimulation.ts`, add `getFollow: () => FollowContext` to the args and pass it into `advanceCompanion(...)` as the last argument in the tick loop. Import `FollowContext` from `../behaviorEngine`. Default when not provided: `() => ({ active: false, pounce: false, cursor: null, cursorIdleMs: 0 })`.

- [ ] **Step 2:** In `Overlay.tsx`, subscribe to the cursor and track idle time:

```tsx
const cursorRef = useRef<{ x: number; y: number } | null>(null);
const cursorMovedAtRef = useRef(0);
useEffect(() => {
  if (!window.petEngine?.onCursor) return;
  return window.petEngine.onCursor((point) => {
    const prev = cursorRef.current;
    if (!point || !prev || Math.hypot(point.x - prev.x, point.y - prev.y) > 3) {
      cursorMovedAtRef.current = performance.now();
    }
    cursorRef.current = point;
  });
}, []);

const getFollow = useCallback(
  () => ({
    active: Boolean(snapshot.settings.followMode) && cursorRef.current !== null,
    pounce: Boolean(snapshot.settings.pounce),
    cursor: cursorRef.current,
    cursorIdleMs: performance.now() - cursorMovedAtRef.current
  }),
  [snapshot.settings.followMode, snapshot.settings.pounce]
);
```

Pass `getFollow` into `useCompanionSimulation`. Also subscribe to `onCommand` and apply via `commandRuntime` mapped over runtime (add an imperative setter in the hook, e.g. `applyCommand(behavior, target, ids)`; simplest is to expose a `command(ids, behavior)` from the hook that maps `commandRuntime`).

- [ ] **Step 3:** `npm run build` + `npm test` (PASS). Commit — `git add src/overlay/useCompanionSimulation.ts src/Overlay.tsx && git commit -m "feat: thread cursor follow into overlay simulation"`.

---

### Task 4: Panel follow/pounce toggles + tray sync + command re-wire

**Files:** Modify `src/App.tsx`, `src/components/CommandBar.tsx`.

- [ ] **Step 1:** In `App.tsx`, add an effect calling `window.petEngine?.setFollow(settings.followMode)` on `followMode` change. The existing `onTrayToggleFollow` effect should `updateSettings({ followMode: enabled })`.
- [ ] **Step 2:** Re-wire `CommandBar` props: `onCommand={(behavior, target) => window.petEngine?.pushCommand({ behavior, target })}`, `onCall={() => window.petEngine?.pushCommand({ behavior: "walk", target: "selected", id: selectedPetId })}` (call = follow-to-center is deferred; walk is fine), `onReset={() => window.petEngine?.pushCommand({ behavior: "idle", target: "all" })}`.
- [ ] **Step 3:** In `CommandBar.tsx`, add two toggle buttons bound to `settings.followMode` and `settings.pounce` via `onSettingsChange`.
- [ ] **Step 4:** `npm run build` + `npm test` (PASS). Commit — `git add src/App.tsx src/components/CommandBar.tsx && git commit -m "feat: wire follow toggle and overlay commands from the panel"`.

---

### Task 5: Stalk/pounce/chase rig poses + visual QA

**Files:** Modify `src/PetAvatar.tsx`, `src/avatars/CatWalkRig.tsx`, `src/styles.css`.

- [ ] **Step 1:** Route `chase`, `stalk`, `pounce` (cats) to `CatWalkRig` as well (extend `LOCOMOTION`). Give the rig a `pose` prop or read behavior to set the root class: `pose-walk`, `pose-chase` (faster `cat-step`), `pose-stalk` (crouch: lower body, legs bent, tail low), `pose-pounce` (stretched leap).
- [ ] **Step 2:** Add CSS for `pose-chase` (0.32s step), `pose-stalk` (translateY down + slow tail), `pose-pounce` (scaleX stretch). Keep `prefers-reduced-motion` off-switch.
- [ ] **Step 3:** Preview loop: verify chase/stalk/pounce read correctly; verify in-app follow (all pets walk to cursor, cats pounce when cursor idle). `npm test` + `npm run build` green. Commit.
```

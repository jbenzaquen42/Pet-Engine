# Martyn and Charles Desktop Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Pet Engine into a compact desktop companion app centered on locked custom Martyn and Charles cats, with original-style catalog pets available as summonable extras.

**Architecture:** Move companion definitions and storage migration into dedicated data/state modules, extract pure behavior math into `src/behaviorEngine.ts`, then simplify `src/App.tsx` into a state coordinator that renders focused UI components. Keep the app local-first and use hand-authored SVG avatars for Martyn and Charles.

**Tech Stack:** Electron 32, Vite 5, React 18, TypeScript 5, lucide-react, Vitest for pure-function and server-rendered component tests.

## Global Constraints

- Martyn and Charles are the only custom cats and are not editable.
- Martyn and Charles are visually distinct and recognizable from the reference folders.
- Charles behavior feels more loungey and stretchy.
- Martyn behavior feels more watchful and grounded.
- Original-style pets remain available as summonable catalog companions.
- The app feels more like a compact desktop companion utility than a profile editor.
- Existing productivity tools remain usable.
- No runtime image-generation, external AI services, cloud sync, accounts, or multiplayer behavior.
- The implementation remains local-first with no server requirement beyond the Vite dev server.
- Click-through mode must have a guaranteed recovery path: register a global Electron shortcut, `Ctrl+Alt+P`, that disables click-through and restores a focusable window.
- Click-through should reset to disabled on app launch.
- The app builds successfully with `npm run build`.

---

## Task Completion Checklist

- [ ] Task 1: Companion Data, Storage Migration, and Test Harness
- [ ] Task 2: Behavior Engine Extraction
- [ ] Task 3: App State Wiring and Summon/Hide Flow
- [ ] Task 4: Authored Martyn and Charles Avatars
- [ ] Task 5: Companion Tray, Stage, and Command Components
- [ ] Task 6: Tool Drawer Extraction and Click-Through Desktop Recovery
- [ ] Task 7: Visual QA, Tuning, and Final Verification

Update this checklist as each task passes task review and is recorded in `.superpowers/sdd/progress.md`.

---

## File Structure

- Modify `package.json`
  - Add `test` script for Vitest.
  - Add `vitest` as a dev dependency.

- Modify `package-lock.json`
  - Update through `npm install --save-dev vitest`.

- Modify `src/types.ts`
  - Add custom/catalog companion flags, authored avatar ids, richer behavior states, personality weights, companion state, and click-through setting.

- Modify `src/data.ts`
  - Replace generic editable defaults with locked Martyn and Charles plus original-style catalog definitions.
  - Preserve initial settings and productivity defaults.

- Create `src/companionState.ts`
  - Own storage schema versioning, default companion state creation, migration from old pet arrays, lookup helpers, summon/hide helpers, and selected companion fallback.

- Create `src/companionState.test.ts`
  - Verify migration, locked custom cats, catalog availability, and selection fallback.

- Create `src/behaviorEngine.ts`
  - Own runtime creation, reconciliation, bounds, movement, gravity, commands, random weighted state transitions, and companion sizing.

- Create `src/behaviorEngine.test.ts`
  - Verify behavior transitions, gravity, custom personality selection, bounds, and command behavior.

- Modify `src/PetAvatar.tsx`
  - Add authored `MartynAvatar` and `CharlesAvatar`.
  - Route by `pet.avatar`.
  - Keep catalog SVGs available.

- Create `src/PetAvatar.test.tsx`
  - Server-render custom avatars and verify identity labels/classes and behavior-specific pose markers.

- Create `src/components/CompanionTray.tsx`
  - Render locked custom cat entries and original-style catalog summon/hide controls.

- Create `src/components/CompanionTray.test.tsx`
  - Server-render tray and verify locked cats have no editor inputs while catalog pets have summon/hide controls.

- Create `src/components/PetStage.tsx`
  - Render the stage, floor, and summoned companion actors.

- Create `src/components/CommandBar.tsx`
  - Render behavior commands, global settings, and click-through toggle.

- Create `src/components/ToolDrawer.tsx`
  - Move existing notes/tasks/timer/stats drawer out of `App.tsx`.

- Modify `src/App.tsx`
  - Use companion state instead of editable pet array.
  - Use behavior engine functions.
  - Render new focused components.
  - Keep notes, tasks, timer, stats, desktop mode, always-on-top, and local storage behavior.

- Modify `src/storage.ts`
  - Let the local-storage hook normalize parsed stored values before using them.

- Modify `src/vite-env.d.ts`
  - Add click-through recovery listener type.

- Modify `electron/main.cjs`
  - Add click-through state tracking and `Ctrl+Alt+P` global shortcut recovery.

- Modify `electron/preload.cjs`
  - Expose click-through recovery events to the renderer.

---

### Task 1: Companion Data, Storage Migration, and Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/types.ts`
- Modify: `src/data.ts`
- Modify: `src/storage.ts`
- Create: `src/companionState.ts`
- Create: `src/companionState.test.ts`

**Interfaces:**
- Produces: `CompanionState`, `CompanionKind`, `AvatarId`, `PersonalityWeights`, and expanded `Behavior` in `src/types.ts`.
- Produces: `customCompanions`, `catalogCompanions`, `initialCompanionState`, `initialSettings`, and `initialTasks` in `src/data.ts`.
- Produces: `normalizeCompanionState(value: unknown): CompanionState`, `getSummonedCompanions(companions: PetProfile[]): PetProfile[]`, `findSelectedCompanion(companions: PetProfile[], selectedId: string | undefined): PetProfile | undefined`, `setCompanionSummoned(companions: PetProfile[], id: string, summoned: boolean): PetProfile[]`, and `COMPANION_SCHEMA_VERSION` in `src/companionState.ts`.
- Consumed by: Tasks 2, 4, and 5.

- [ ] **Step 1: Install Vitest**

Run:

```powershell
npm install --save-dev vitest
```

Expected: `package.json` and `package-lock.json` update successfully.

- [ ] **Step 2: Add the test script**

Edit `package.json` so `scripts` includes:

```json
{
  "test": "vitest run"
}
```

Keep all existing scripts unchanged.

- [ ] **Step 3: Write the failing companion-state tests**

Create `src/companionState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { catalogCompanions, customCompanions, initialCompanionState } from "./data";
import {
  COMPANION_SCHEMA_VERSION,
  findSelectedCompanion,
  getSummonedCompanions,
  normalizeCompanionState,
  setCompanionSummoned
} from "./companionState";
import type { PetProfile } from "./types";

describe("companion state", () => {
  it("defines exactly two locked custom cats", () => {
    expect(customCompanions.map((pet) => pet.id)).toEqual(["martyn", "charles"]);
    expect(customCompanions.every((pet) => pet.kind === "custom")).toBe(true);
    expect(customCompanions.every((pet) => pet.locked)).toBe(true);
    expect(customCompanions.map((pet) => pet.name)).toEqual(["Martyn", "Charles"]);
  });

  it("keeps original-style catalog companions separate from custom cats", () => {
    expect(catalogCompanions.length).toBeGreaterThanOrEqual(6);
    expect(catalogCompanions.every((pet) => pet.kind === "catalog")).toBe(true);
    expect(catalogCompanions.every((pet) => !pet.locked)).toBe(true);
    expect(catalogCompanions.some((pet) => pet.id === "bag")).toBe(true);
  });

  it("migrates old editable pet arrays into the locked custom cats plus catalog", () => {
    const oldPets: Array<Partial<PetProfile>> = [
      { id: "patch", name: "Edited Patch", species: "cat", pattern: "patch-cat" },
      { id: "charles", name: "Wrong Name", species: "cat", pattern: "tabby" }
    ];

    const migrated = normalizeCompanionState(oldPets);

    expect(migrated.schemaVersion).toBe(COMPANION_SCHEMA_VERSION);
    expect(migrated.companions.find((pet) => pet.id === "martyn")?.locked).toBe(true);
    expect(migrated.companions.find((pet) => pet.id === "charles")?.name).toBe("Charles");
    expect(migrated.companions.find((pet) => pet.name === "Edited Patch")).toBeUndefined();
  });

  it("preserves valid v2 summoned flags while enforcing authored custom cat fields", () => {
    const stored = {
      schemaVersion: COMPANION_SCHEMA_VERSION,
      companions: initialCompanionState.companions.map((pet) =>
        pet.id === "bag" ? { ...pet, summoned: true } : pet.id === "martyn" ? { ...pet, name: "Wrong" } : pet
      )
    };

    const normalized = normalizeCompanionState(stored);

    expect(normalized.companions.find((pet) => pet.id === "bag")?.summoned).toBe(true);
    expect(normalized.companions.find((pet) => pet.id === "martyn")?.name).toBe("Martyn");
  });

  it("returns summoned companions and falls back selection to the first summoned companion", () => {
    const companions = setCompanionSummoned(initialCompanionState.companions, "bag", true);

    expect(getSummonedCompanions(companions).map((pet) => pet.id)).toContain("bag");
    expect(findSelectedCompanion(companions, "missing")?.id).toBe("martyn");
  });
});
```

- [ ] **Step 4: Run the failing companion-state tests**

Run:

```powershell
npm test -- src/companionState.test.ts
```

Expected: FAIL because `src/companionState.ts` does not exist and the new type fields do not exist.

- [ ] **Step 5: Update shared types**

Modify `src/types.ts` so it contains these exported shapes:

```ts
export type Species = "cat" | "dog" | "capybara" | "elephant" | "raccoon" | "monster" | "object";

export type Pattern =
  | "patch-cat"
  | "calico"
  | "keyboard-buddy"
  | "capybara"
  | "snack-capybara"
  | "elephant"
  | "raccoon"
  | "blue-monster"
  | "punching-bag"
  | "tabby"
  | "tuxedo"
  | "yorkie";

export type AuthoredAvatar = "martyn" | "charles";
export type AvatarId = Pattern | AuthoredAvatar;
export type CompanionKind = "custom" | "catalog";
export type Behavior = "idle" | "walk" | "sit" | "sleep" | "stretch" | "watch" | "jump" | "fall" | "drag";

export interface PersonalityWeights {
  idleWeight: number;
  walkWeight: number;
  sitWeight: number;
  sleepWeight: number;
  stretchWeight: number;
  watchWeight: number;
  jumpWeight: number;
  wanderBias: number;
}

export interface PetProfile {
  id: string;
  name: string;
  species: Species;
  kind: CompanionKind;
  locked: boolean;
  summoned: boolean;
  avatar: AvatarId;
  pattern: Pattern;
  breedLabel: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  eyeColor: string;
  size: number;
  speed: number;
  energy: number;
  personality: PersonalityWeights;
}

export interface PetRuntime {
  id: string;
  x: number;
  y: number;
  direction: 1 | -1;
  behavior: Behavior;
  vy: number;
  phase: number;
  stateStartedAt: number;
  targetX?: number;
  lastInteractionAt: number;
}

export interface CompanionState {
  schemaVersion: number;
  companions: PetProfile[];
}

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
}

export interface EngineSettings {
  alwaysOnTop: boolean;
  desktopMode: boolean;
  panelOpen: boolean;
  showNames: boolean;
  physics: boolean;
  clickThrough: boolean;
  globalScale: number;
  globalSpeed: number;
}
```

- [ ] **Step 6: Replace companion defaults**

Modify `src/data.ts` to export custom companions, catalog companions, and state:

```ts
import type { CompanionState, EngineSettings, PersonalityWeights, PetProfile, TaskItem } from "./types";

const calmCatalogPersonality: PersonalityWeights = {
  idleWeight: 4,
  walkWeight: 3,
  sitWeight: 2,
  sleepWeight: 1.4,
  stretchWeight: 0.4,
  watchWeight: 0.5,
  jumpWeight: 0.4,
  wanderBias: 0.55
};

export const customCompanions: PetProfile[] = [
  {
    id: "martyn",
    name: "Martyn",
    species: "cat",
    kind: "custom",
    locked: true,
    summoned: true,
    avatar: "martyn",
    pattern: "tuxedo",
    breedLabel: "watchful house cat",
    primaryColor: "#f7f5ed",
    secondaryColor: "#34343a",
    accentColor: "#202025",
    eyeColor: "#4f654b",
    size: 1.02,
    speed: 0.42,
    energy: 0.46,
    personality: {
      idleWeight: 4.8,
      walkWeight: 1.6,
      sitWeight: 4.2,
      sleepWeight: 1.8,
      stretchWeight: 0.5,
      watchWeight: 4.6,
      jumpWeight: 0.35,
      wanderBias: 0.32
    }
  },
  {
    id: "charles",
    name: "Charles",
    species: "cat",
    kind: "custom",
    locked: true,
    summoned: true,
    avatar: "charles",
    pattern: "tabby",
    breedLabel: "orange-and-white lounger",
    primaryColor: "#fff4e6",
    secondaryColor: "#d8843f",
    accentColor: "#8e5a34",
    eyeColor: "#6f7a43",
    size: 1.08,
    speed: 0.36,
    energy: 0.38,
    personality: {
      idleWeight: 3.2,
      walkWeight: 1.4,
      sitWeight: 3.4,
      sleepWeight: 4.7,
      stretchWeight: 3.9,
      watchWeight: 1,
      jumpWeight: 0.25,
      wanderBias: 0.24
    }
  }
];

export const catalogCompanions: PetProfile[] = [
  {
    id: "bag",
    name: "Bag",
    species: "object",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "punching-bag",
    pattern: "punching-bag",
    breedLabel: "training buddy",
    primaryColor: "#f5c34b",
    secondaryColor: "#2f7caa",
    accentColor: "#4b4035",
    eyeColor: "#2a2520",
    size: 0.78,
    speed: 0.28,
    energy: 0.38,
    personality: calmCatalogPersonality
  },
  {
    id: "patch",
    name: "Patch",
    species: "cat",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "patch-cat",
    pattern: "patch-cat",
    breedLabel: "patch cat",
    primaryColor: "#fff7ec",
    secondaryColor: "#e19d55",
    accentColor: "#514238",
    eyeColor: "#3f3029",
    size: 0.82,
    speed: 0.68,
    energy: 0.54,
    personality: calmCatalogPersonality
  },
  {
    id: "keys",
    name: "Keys",
    species: "cat",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "keyboard-buddy",
    pattern: "keyboard-buddy",
    breedLabel: "keyboard buddy",
    primaryColor: "#d4894d",
    secondaryColor: "#f2a75c",
    accentColor: "#7b4d34",
    eyeColor: "#4d3325",
    size: 1.05,
    speed: 0.56,
    energy: 0.66,
    personality: calmCatalogPersonality
  },
  {
    id: "nibbles",
    name: "Capy",
    species: "capybara",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "capybara",
    pattern: "capybara",
    breedLabel: "capybara",
    primaryColor: "#b77a47",
    secondaryColor: "#ffd2b8",
    accentColor: "#704b32",
    eyeColor: "#4c3325",
    size: 0.96,
    speed: 0.45,
    energy: 0.48,
    personality: calmCatalogPersonality
  },
  {
    id: "peanut",
    name: "Peanut",
    species: "elephant",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "elephant",
    pattern: "elephant",
    breedLabel: "tiny elephant",
    primaryColor: "#9db6c4",
    secondaryColor: "#d9eef2",
    accentColor: "#5f7480",
    eyeColor: "#34424a",
    size: 0.98,
    speed: 0.38,
    energy: 0.44,
    personality: calmCatalogPersonality
  },
  {
    id: "sprout",
    name: "Sprout",
    species: "monster",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "blue-monster",
    pattern: "blue-monster",
    breedLabel: "tiny horn blob",
    primaryColor: "#5dd4d1",
    secondaryColor: "#f7f0ff",
    accentColor: "#8b63c7",
    eyeColor: "#3d346b",
    size: 0.82,
    speed: 0.92,
    energy: 0.92,
    personality: calmCatalogPersonality
  },
  {
    id: "bandit",
    name: "Bandit",
    species: "raccoon",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "raccoon",
    pattern: "raccoon",
    breedLabel: "ringtail buddy",
    primaryColor: "#d9c4a7",
    secondaryColor: "#5a4238",
    accentColor: "#7b5a45",
    eyeColor: "#302722",
    size: 0.92,
    speed: 0.72,
    energy: 0.62,
    personality: calmCatalogPersonality
  },
  {
    id: "yorkie",
    name: "Yorkie",
    species: "dog",
    kind: "catalog",
    locked: false,
    summoned: false,
    avatar: "yorkie",
    pattern: "yorkie",
    breedLabel: "yorkie terrier",
    primaryColor: "#9b6d3b",
    secondaryColor: "#d8b985",
    accentColor: "#393229",
    eyeColor: "#34261f",
    size: 0.9,
    speed: 0.58,
    energy: 0.56,
    personality: calmCatalogPersonality
  }
];

export const initialCompanionState: CompanionState = {
  schemaVersion: 2,
  companions: [...customCompanions, ...catalogCompanions]
};

export const initialSettings: EngineSettings = {
  alwaysOnTop: true,
  desktopMode: false,
  panelOpen: true,
  showNames: true,
  physics: true,
  clickThrough: false,
  globalScale: 1,
  globalSpeed: 1
};

export const initialTasks: TaskItem[] = [
  { id: "task-water", text: "Refresh water bowls", done: false },
  { id: "task-break", text: "Take a stretch break", done: false },
  { id: "task-focus", text: "Finish one focus block", done: true }
];
```

- [ ] **Step 7: Add companion-state migration helpers**

Create `src/companionState.ts`:

```ts
import { catalogCompanions, customCompanions, initialCompanionState } from "./data";
import type { CompanionState, PetProfile } from "./types";

export const COMPANION_SCHEMA_VERSION = 2;

function cloneCompanion(pet: PetProfile): PetProfile {
  return {
    ...pet,
    personality: { ...pet.personality }
  };
}

export function createDefaultCompanionState(): CompanionState {
  return {
    schemaVersion: COMPANION_SCHEMA_VERSION,
    companions: initialCompanionState.companions.map(cloneCompanion)
  };
}

function isCompanionState(value: unknown): value is CompanionState {
  return Boolean(
    value &&
      typeof value === "object" &&
      "schemaVersion" in value &&
      "companions" in value &&
      Array.isArray((value as CompanionState).companions)
  );
}

export function normalizeCompanionState(value: unknown): CompanionState {
  const defaults = createDefaultCompanionState();

  if (!isCompanionState(value) || value.schemaVersion !== COMPANION_SCHEMA_VERSION) {
    return defaults;
  }

  const storedById = new Map(value.companions.map((pet) => [pet.id, pet]));
  const companions = [...customCompanions, ...catalogCompanions].map((defaultPet) => {
    const stored = storedById.get(defaultPet.id);
    return {
      ...cloneCompanion(defaultPet),
      summoned: stored?.summoned ?? defaultPet.summoned
    };
  });

  return {
    schemaVersion: COMPANION_SCHEMA_VERSION,
    companions
  };
}

export function getSummonedCompanions(companions: PetProfile[]) {
  return companions.filter((pet) => pet.summoned);
}

export function findSelectedCompanion(companions: PetProfile[], selectedId: string | undefined) {
  return companions.find((pet) => pet.id === selectedId && pet.summoned) ?? getSummonedCompanions(companions)[0];
}

export function setCompanionSummoned(companions: PetProfile[], id: string, summoned: boolean) {
  return companions.map((pet) => (pet.id === id ? { ...pet, summoned } : pet));
}
```

- [ ] **Step 8: Add storage normalization support**

Modify `src/storage.ts`:

```ts
import { useEffect, useState } from "react";

export function useLocalStorageState<T>(key: string, initialValue: T, normalize?: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) {
        return initialValue;
      }
      const parsed = JSON.parse(stored) as unknown;
      return normalize ? normalize(parsed) : (parsed as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Local persistence is a convenience; the app should still run if storage is unavailable.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function uid(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}
```

- [ ] **Step 9: Run tests and build**

Run:

```powershell
npm test -- src/companionState.test.ts
npm run build
```

Expected: companion-state tests PASS and build PASS.

- [ ] **Step 10: Commit Task 1**

Run:

```powershell
git add package.json package-lock.json src/types.ts src/data.ts src/storage.ts src/companionState.ts src/companionState.test.ts
git commit -m "feat: add companion state model"
```

---

### Task 2: Behavior Engine Extraction

**Files:**
- Create: `src/behaviorEngine.ts`
- Create: `src/behaviorEngine.test.ts`

**Interfaces:**
- Consumes: `PetProfile`, `PetRuntime`, `Behavior`, and `EngineSettings` from `src/types.ts`.
- Produces: `StageBounds`, `createInitialRuntime(pets: PetProfile[], bounds?: StageBounds): PetRuntime[]`, `reconcileRuntime(current: PetRuntime[], pets: PetProfile[], bounds?: StageBounds): PetRuntime[]`, `advanceCompanion(runtime: PetRuntime, pet: PetProfile, settings: EngineSettings, bounds: StageBounds, delta: number, now: number, random?: () => number): PetRuntime`, `commandRuntime(runtime: PetRuntime, behavior: Behavior, now: number): PetRuntime`, `getPetSize(pet: PetProfile, settings: EngineSettings): number`, and `getGroundY(pet: PetProfile, settings: EngineSettings, height: number): number`.
- Consumed by: Task 3.

- [ ] **Step 1: Write the failing behavior-engine tests**

Create `src/behaviorEngine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { customCompanions, initialSettings } from "./data";
import {
  advanceCompanion,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime
} from "./behaviorEngine";
import type { PetRuntime } from "./types";

const bounds = { width: 900, height: 520 };
const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
const charles = customCompanions.find((pet) => pet.id === "charles")!;

function runtimeFor(id: string, patch: Partial<PetRuntime> = {}): PetRuntime {
  return {
    id,
    x: 100,
    y: 320,
    direction: 1,
    behavior: "idle",
    vy: 0,
    phase: 0,
    stateStartedAt: 0,
    lastInteractionAt: 0,
    ...patch
  };
}

describe("behavior engine", () => {
  it("creates bounded runtime for each summoned companion", () => {
    const runtimes = createInitialRuntime([martyn, charles], bounds);

    expect(runtimes).toHaveLength(2);
    expect(runtimes[0].id).toBe("martyn");
    expect(runtimes[0].x).toBeGreaterThanOrEqual(8);
    expect(runtimes[0].y).toBe(getGroundY(martyn, initialSettings, bounds.height));
  });

  it("reconciles runtime by dropping missing ids and adding new companions", () => {
    const current = [runtimeFor("missing"), runtimeFor("martyn")];
    const reconciled = reconcileRuntime(current, [martyn, charles], bounds);

    expect(reconciled.map((runtime) => runtime.id)).toEqual(["martyn", "charles"]);
  });

  it("turns an idle Charles into stretch when the weighted roll lands in stretch", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { behavior: "idle", stateStartedAt: 0 }),
      charles,
      initialSettings,
      bounds,
      16.67,
      2500,
      () => 0.82
    );

    expect(next.behavior).toBe("stretch");
  });

  it("turns an idle Martyn into watch when the weighted roll lands in watch", () => {
    const next = advanceCompanion(
      runtimeFor("martyn", { behavior: "idle", stateStartedAt: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      2500,
      () => 0.88
    );

    expect(next.behavior).toBe("watch");
  });

  it("lands falling companions on the ground", () => {
    const ground = getGroundY(martyn, initialSettings, bounds.height);
    const next = advanceCompanion(
      runtimeFor("martyn", { behavior: "fall", y: ground - 2, vy: 6 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0
    );

    expect(next.behavior).toBe("idle");
    expect(next.y).toBe(ground);
    expect(next.vy).toBe(0);
  });

  it("commands behavior and sets fall velocity only for fall", () => {
    expect(commandRuntime(runtimeFor("martyn"), "jump", 1200).behavior).toBe("jump");
    expect(commandRuntime(runtimeFor("martyn"), "fall", 1200).vy).toBe(1);
  });

  it("uses size and global scale together", () => {
    expect(getPetSize(martyn, { ...initialSettings, globalScale: 1.25 })).toBeGreaterThan(getPetSize(martyn, initialSettings));
  });
});
```

- [ ] **Step 2: Run the failing behavior-engine tests**

Run:

```powershell
npm test -- src/behaviorEngine.test.ts
```

Expected: FAIL because `src/behaviorEngine.ts` does not exist.

- [ ] **Step 3: Implement the behavior engine**

Create `src/behaviorEngine.ts`:

```ts
import type { Behavior, EngineSettings, PetProfile, PetRuntime } from "./types";

export interface StageBounds {
  width: number;
  height: number;
}

const BASE_PET_SIZE = 150;

export function createInitialRuntime(pets: PetProfile[], bounds: StageBounds = { width: 900, height: 520 }): PetRuntime[] {
  const now = performance.now();
  return pets.map((pet, index) => ({
    id: pet.id,
    x: clamp(48 + index * 92, 8, Math.max(8, bounds.width - getPetSize(pet, defaultScaleSettings()) - 8)),
    y: getGroundY(pet, defaultScaleSettings(), bounds.height),
    direction: index % 2 === 0 ? 1 : -1,
    behavior: index === 1 ? "walk" : "idle",
    vy: 0,
    phase: Math.random() * Math.PI,
    stateStartedAt: now - index * 650,
    lastInteractionAt: now
  }));
}

export function reconcileRuntime(current: PetRuntime[], pets: PetProfile[], bounds: StageBounds = { width: 900, height: 520 }) {
  const existing = new Map(current.map((entry) => [entry.id, entry]));
  const additions = createInitialRuntime(pets, bounds);

  return pets.map((pet, index) => {
    const runtime = existing.get(pet.id) ?? additions[index];
    return keepInBounds(runtime, pet, defaultScaleSettings(), bounds);
  });
}

export function commandRuntime(runtime: PetRuntime, behavior: Behavior, now: number): PetRuntime {
  return {
    ...runtime,
    behavior,
    stateStartedAt: now,
    vy: behavior === "fall" ? 1 : 0,
    lastInteractionAt: now
  };
}

export function advanceCompanion(
  petRuntime: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  bounds: StageBounds,
  delta: number,
  now: number,
  random: () => number = Math.random
): PetRuntime {
  const size = getPetSize(pet, settings);
  const maxX = Math.max(8, bounds.width - size - 8);
  const ground = getGroundY(pet, settings, bounds.height);
  const elapsed = now - petRuntime.stateStartedAt;
  const next = {
    ...petRuntime,
    x: clamp(petRuntime.x, 8, maxX),
    phase: petRuntime.phase + delta * 0.006
  };

  if (next.behavior === "drag") {
    return next;
  }

  if (!settings.physics && next.behavior === "fall") {
    return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
  }

  if (next.behavior === "jump") {
    const progress = Math.min(1, elapsed / 720);
    return {
      ...next,
      y: ground - Math.sin(progress * Math.PI) * (52 + pet.energy * 42),
      behavior: progress >= 1 ? "idle" : "jump",
      stateStartedAt: progress >= 1 ? now : next.stateStartedAt
    };
  }

  if (next.behavior === "fall") {
    const vy = next.vy + 0.84;
    const y = next.y + vy;
    if (y >= ground) {
      return { ...next, y: ground, vy: 0, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y, vy };
  }

  if (next.behavior === "sleep" || next.behavior === "sit" || next.behavior === "watch") {
    if (elapsed > 5200 + pet.energy * 2400 && random() < 0.012) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  if (next.behavior === "stretch") {
    if (elapsed > 1450) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  if (next.behavior === "idle") {
    const wakeChance = 0.0035 + pet.energy * 0.004;
    if (elapsed > 1100 && random() < wakeChance) {
      return {
        ...next,
        y: ground,
        behavior: chooseWeightedBehavior(pet, random),
        direction: random() > 0.5 ? 1 : -1,
        stateStartedAt: now
      };
    }
    if (elapsed > 2100 && random() > 0.78) {
      return { ...next, y: ground, behavior: chooseWeightedBehavior(pet, random), stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  const step = (0.42 + pet.speed * 0.78) * settings.globalSpeed * (delta / 16.67);
  let x = next.x + step * next.direction;
  let direction = next.direction;

  if (x <= 8 || x >= maxX) {
    direction = direction === 1 ? -1 : 1;
    x = clamp(x, 8, maxX);
  }

  if (elapsed > 1700 && random() < 0.0045) {
    return {
      ...next,
      x,
      y: ground,
      direction,
      behavior: chooseWeightedBehavior(pet, random),
      stateStartedAt: now
    };
  }

  return { ...next, x, y: ground, direction };
}

export function getPetSize(pet: PetProfile, settings: EngineSettings) {
  return BASE_PET_SIZE * pet.size * settings.globalScale;
}

export function getGroundY(pet: PetProfile, settings: EngineSettings, height: number) {
  return Math.max(72, height - getPetSize(pet, settings) * 0.82 - 28);
}

function chooseWeightedBehavior(pet: PetProfile, random: () => number): Behavior {
  const choices: Array<[Behavior, number]> = [
    ["idle", pet.personality.idleWeight],
    ["walk", pet.personality.walkWeight],
    ["sit", pet.personality.sitWeight],
    ["sleep", pet.personality.sleepWeight],
    ["stretch", pet.personality.stretchWeight],
    ["watch", pet.personality.watchWeight]
  ];
  const total = choices.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;

  for (const [behavior, weight] of choices) {
    roll -= weight;
    if (roll <= 0) {
      return behavior;
    }
  }

  return "idle";
}

function keepInBounds(runtime: PetRuntime, pet: PetProfile, settings: EngineSettings, bounds: StageBounds) {
  const maxX = Math.max(8, bounds.width - getPetSize(pet, settings) - 8);
  return {
    ...runtime,
    x: clamp(runtime.x, 8, maxX),
    y: clamp(runtime.y, 16, getGroundY(pet, settings, bounds.height))
  };
}

function defaultScaleSettings(): EngineSettings {
  return {
    alwaysOnTop: true,
    desktopMode: false,
    panelOpen: true,
    showNames: true,
    physics: true,
    clickThrough: false,
    globalScale: 1,
    globalSpeed: 1
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run behavior tests and build**

Run:

```powershell
npm test -- src/behaviorEngine.test.ts
npm run build
```

Expected: behavior-engine tests PASS and build PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```powershell
git add src/behaviorEngine.ts src/behaviorEngine.test.ts
git commit -m "feat: extract companion behavior engine"
```

---

### Task 3: App State Wiring and Summon/Hide Flow

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `initialCompanionState` from `src/data.ts`.
- Consumes: `normalizeCompanionState`, `getSummonedCompanions`, `findSelectedCompanion`, and `setCompanionSummoned` from `src/companionState.ts`.
- Consumes: `advanceCompanion`, `commandRuntime`, `createInitialRuntime`, `getGroundY`, `getPetSize`, and `reconcileRuntime` from `src/behaviorEngine.ts`.
- Produces: working app behavior using the new companion state while the old UI is reduced to selection plus core commands.

- [ ] **Step 1: Replace companion imports and storage key**

In `src/App.tsx`, replace imports from `./data` and add state helpers:

```ts
import { initialCompanionState, initialSettings, initialTasks } from "./data";
import {
  findSelectedCompanion,
  getSummonedCompanions,
  normalizeCompanionState,
  setCompanionSummoned
} from "./companionState";
import {
  advanceCompanion,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime
} from "./behaviorEngine";
```

Change the storage key:

```ts
const STORAGE_KEYS = {
  companions: "personal-pet-engine:companions:v2",
  settings: "personal-pet-engine:settings",
  notes: "personal-pet-engine:notes",
  tasks: "personal-pet-engine:tasks",
  stats: "personal-pet-engine:stats"
};
```

- [ ] **Step 2: Replace pet array state with companion state**

In `App`, replace the pet state setup:

```ts
const [companionState, setCompanionState] = useLocalStorageState(
  STORAGE_KEYS.companions,
  initialCompanionState,
  normalizeCompanionState
);
const companions = companionState.companions;
const summonedCompanions = useMemo(() => getSummonedCompanions(companions), [companions]);
const [selectedPetId, setSelectedPetId] = useState(() => summonedCompanions[0]?.id ?? "martyn");
const selectedPet = findSelectedCompanion(companions, selectedPetId);
```

Replace every `pets` stage loop with `summonedCompanions`.

- [ ] **Step 3: Remove profile editing callbacks**

Delete `speciesDefaults`, `speciesOptions`, `patternOptions`, `updateSelectedPet`, `ColorField`, and editor fields from the rendered rail. Keep only selection and summon/hide until Task 5 replaces the component.

Add a local updater:

```ts
const updateCompanions = useCallback(
  (updater: (companions: PetProfile[]) => PetProfile[]) => {
    setCompanionState((current) => ({
      ...current,
      companions: updater(current.companions)
    }));
  },
  [setCompanionState]
);

const toggleSummoned = useCallback(
  (id: string, summoned: boolean) => {
    updateCompanions((current) => setCompanionSummoned(current, id, summoned));
    if (summoned) {
      setSelectedPetId(id);
    }
  },
  [updateCompanions]
);
```

- [ ] **Step 4: Wire runtime reconciliation to summoned companions**

Change runtime setup and reconciliation:

```ts
const [runtime, setRuntime] = useState<PetRuntime[]>(() => createInitialRuntime(summonedCompanions));

useEffect(() => {
  const rect = stageRef.current?.getBoundingClientRect();
  setRuntime((current) =>
    reconcileRuntime(current, summonedCompanions, {
      width: rect?.width ?? 900,
      height: rect?.height ?? 520
    })
  );

  if (!summonedCompanions.some((pet) => pet.id === selectedPetId) && summonedCompanions[0]) {
    setSelectedPetId(summonedCompanions[0].id);
  }
}, [summonedCompanions, selectedPetId]);
```

- [ ] **Step 5: Wire animation and commands to behavior engine**

Inside the animation frame update, replace the old `advancePet` call with:

```ts
return advanceCompanion(
  petRuntime,
  pet,
  settings,
  { width: rect.width, height: rect.height },
  delta,
  now
);
```

In `commandPet`, replace the mapped update body with:

```ts
targetIds.includes(petRuntime.id) ? commandRuntime(petRuntime, behavior, now) : petRuntime
```

- [ ] **Step 6: Remove local behavior helpers from `App.tsx`**

Delete these functions from `src/App.tsx` because Task 2 owns them:

```ts
createInitialRuntime
reconcileRuntime
advancePet
getPetSize
getGroundY
clamp
```

Keep `formatTimer` and `formatDuration`.

- [ ] **Step 7: Run all tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: all tests PASS and build PASS.

- [ ] **Step 8: Commit Task 3**

Run:

```powershell
git add src/App.tsx
git commit -m "feat: wire app to companion state"
```

---

### Task 4: Authored Martyn and Charles Avatars

**Files:**
- Modify: `src/PetAvatar.tsx`
- Create: `src/PetAvatar.test.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `pet.avatar` from `PetProfile`.
- Produces: `MartynAvatar` and `CharlesAvatar` rendered by `PetAvatar`.
- Consumed by: Task 5 stage and tray components.

- [ ] **Step 1: Write failing avatar render tests**

Create `src/PetAvatar.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "./data";
import { PetAvatar } from "./PetAvatar";

const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
const charles = customCompanions.find((pet) => pet.id === "charles")!;

describe("PetAvatar custom cats", () => {
  it("renders Martyn with authored identity and watch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={martyn} behavior="watch" />);

    expect(markup).toContain("Martyn watchful house cat");
    expect(markup).toContain("martyn-avatar");
    expect(markup).toContain("pose-watch");
  });

  it("renders Charles with authored identity and stretch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={charles} behavior="stretch" />);

    expect(markup).toContain("Charles orange-and-white lounger");
    expect(markup).toContain("charles-avatar");
    expect(markup).toContain("pose-stretch");
  });
});
```

- [ ] **Step 2: Run failing avatar tests**

Run:

```powershell
npm test -- src/PetAvatar.test.tsx
```

Expected: FAIL because custom authored avatars and pose markers do not exist.

- [ ] **Step 3: Route custom avatars by `pet.avatar`**

At the top of `PetAvatar`, switch on `pet.avatar` before generic patterns:

```tsx
export function PetAvatar({ pet, behavior = "idle", compact = false }: PetAvatarProps) {
  const props = { pet, behavior, compact };

  switch (pet.avatar) {
    case "martyn":
      return <MartynAvatar {...props} />;
    case "charles":
      return <CharlesAvatar {...props} />;
    case "punching-bag":
      return <PunchingBag {...props} />;
    case "keyboard-buddy":
      return <KeyboardBuddy {...props} />;
    case "capybara":
    case "snack-capybara":
      return <CapybaraBuddy {...props} />;
    case "elephant":
      return <ElephantBuddy {...props} />;
    case "blue-monster":
      return <BlueMonster {...props} />;
    case "raccoon":
      return <RaccoonBuddy {...props} />;
    case "yorkie":
      return <YorkieBuddy {...props} />;
    default:
      return <PatchCat {...props} />;
  }
}
```

- [ ] **Step 4: Add authored Martyn avatar**

Add this function in `src/PetAvatar.tsx` below `SvgShell`:

```tsx
function MartynAvatar({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";
  const watch = behavior === "watch";
  const poseClass = `martyn-avatar pose-${behavior}`;

  return (
    <SvgShell label={`${pet.name} ${pet.breedLabel}`} compact={compact}>
      <g className={poseClass}>
        <ellipse className="soft-shadow" cx="92" cy="132" rx="48" ry="8" opacity={compact ? 0 : 1} />
        <path
          d={watch ? "M56 87 C58 54 76 34 101 34 C128 34 145 57 143 88 C141 116 120 128 96 127 C70 126 54 113 56 87Z" : "M48 94 C52 63 76 45 108 47 C135 49 151 67 148 96 C145 119 121 130 91 126 C64 123 45 113 48 94Z"}
          fill={pet.primaryColor}
          stroke={outline}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M70 55 L81 29 L95 51Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M121 51 L137 31 L140 59Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M82 38 C94 28 119 30 128 48 C112 45 96 46 82 38Z" fill={pet.secondaryColor} />
        <path d="M122 95 C145 99 153 117 139 127 C124 124 119 110 122 95Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <ellipse cx="102" cy="84" rx="27" ry="21" fill="#fffaf2" opacity="0.95" />
        {sleeping ? (
          <>
            <path d="M83 71 C90 77 98 77 105 71" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M113 71 C120 77 128 77 135 71" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="91" cy={watch ? 67 : 70} r="4.5" fill={pet.eyeColor} />
            <circle cx="121" cy={watch ? 67 : 70} r="4.5" fill={pet.eyeColor} />
          </>
        )}
        <ellipse cx="106" cy="82" rx="6" ry="4" fill={face} />
        <path d="M106 86 C100 92 93 92 87 88" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M107 86 C112 92 119 92 125 88" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M76 113 C83 121 94 121 101 113" fill="none" stroke={outline} strokeWidth="7" strokeLinecap="round" />
        <path d="M127 113 C120 121 110 121 103 113" fill="none" stroke={outline} strokeWidth="7" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}
```

- [ ] **Step 5: Add authored Charles avatar**

Add this function after `MartynAvatar`:

```tsx
function CharlesAvatar({ pet, behavior, compact }: Required<PetAvatarProps>) {
  const sleeping = behavior === "sleep";
  const stretch = behavior === "stretch";
  const poseClass = `charles-avatar pose-${behavior}`;

  return (
    <SvgShell label={`${pet.name} ${pet.breedLabel}`} compact={compact}>
      <g className={poseClass}>
        <ellipse className="soft-shadow" cx="92" cy="132" rx={stretch ? "58" : "50"} ry="8" opacity={compact ? 0 : 1} />
        <path
          d={stretch ? "M35 96 C48 67 78 53 118 58 C145 61 159 76 153 101 C146 126 103 131 67 122 C45 117 29 109 35 96Z" : "M49 88 C51 57 73 35 101 35 C130 35 148 58 146 88 C144 115 122 128 95 127 C68 126 47 114 49 88Z"}
          fill={pet.primaryColor}
          stroke={outline}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M62 57 L72 30 L88 52Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M122 52 L140 32 L143 62Z" fill={pet.primaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M66 52 C78 31 103 32 112 58 C96 67 78 66 66 52Z" fill={pet.secondaryColor} />
        <path d="M112 38 C134 40 146 58 138 77 C124 72 116 59 112 38Z" fill={pet.secondaryColor} opacity="0.94" />
        <path d="M49 95 C30 96 22 111 35 121 C52 119 59 105 49 95Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <path d="M127 105 C149 105 160 119 145 130 C128 129 119 118 127 105Z" fill={pet.secondaryColor} stroke={outline} strokeWidth="5" strokeLinejoin="round" />
        <ellipse cx="102" cy={stretch ? 82 : 84} rx="25" ry="20" fill="#fff8ee" opacity="0.9" />
        {sleeping ? (
          <>
            <path d="M82 72 C89 78 96 78 103 72" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
            <path d="M112 72 C119 78 126 78 133 72" fill="none" stroke={face} strokeWidth="4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="91" cy="70" r="4.5" fill={pet.eyeColor} />
            <circle cx="120" cy="70" r="4.5" fill={pet.eyeColor} />
          </>
        )}
        <ellipse cx="105" cy="82" rx="5" ry="3.6" fill={face} />
        <path d="M105 86 C99 92 93 92 87 88" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M106 86 C111 92 118 92 124 88" fill="none" stroke={face} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M137 100 C161 92 166 66 147 55" fill="none" stroke={pet.secondaryColor} strokeWidth="10" strokeLinecap="round" />
      </g>
    </SvgShell>
  );
}
```

- [ ] **Step 6: Add behavior pose CSS**

Add to `src/styles.css` near pet animation rules:

```css
.pose-watch {
  transform-origin: 50% 90%;
  animation: pet-breathe 2.4s ease-in-out infinite;
}

.pose-stretch {
  transform-origin: 50% 95%;
  animation: pet-stretch 1.45s ease-in-out infinite;
}

@keyframes pet-stretch {
  0%,
  100% {
    scale: 1;
  }
  42% {
    scale: 1.08 0.94;
  }
}
```

- [ ] **Step 7: Run avatar tests and build**

Run:

```powershell
npm test -- src/PetAvatar.test.tsx
npm run build
```

Expected: avatar tests PASS and build PASS.

- [ ] **Step 8: Commit Task 4**

Run:

```powershell
git add src/PetAvatar.tsx src/PetAvatar.test.tsx src/styles.css
git commit -m "feat: add authored Martyn and Charles avatars"
```

---

### Task 5: Companion Tray, Stage, and Command Components

**Files:**
- Create: `src/components/CompanionTray.tsx`
- Create: `src/components/CompanionTray.test.tsx`
- Create: `src/components/PetStage.tsx`
- Create: `src/components/CommandBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `PetProfile`, `PetRuntime`, `Behavior`, and `EngineSettings`.
- Produces: `CompanionTray`, `PetStage`, and `CommandBar`.
- Leaves: `ToolDrawer` extraction for Task 6.

- [ ] **Step 1: Write failing companion tray render tests**

Create `src/components/CompanionTray.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionTray } from "./CompanionTray";

describe("CompanionTray", () => {
  it("renders locked custom cats without editor controls", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        selectedPetId="martyn"
        onSelect={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Martyn");
    expect(markup).toContain("Charles");
    expect(markup).toContain("Locked");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<select");
  });

  it("renders catalog summon controls", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        selectedPetId="martyn"
        onSelect={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Original-style catalog");
    expect(markup).toContain("Summon Bag");
    expect(markup).toContain("Summon Patch");
  });
});
```

- [ ] **Step 2: Run failing component tests**

Run:

```powershell
npm test -- src/components/CompanionTray.test.tsx
```

Expected: FAIL because `CompanionTray` does not exist.

- [ ] **Step 3: Create `CompanionTray`**

Create `src/components/CompanionTray.tsx`:

```tsx
import { Check, ChevronRight, Plus, Sparkles, X } from "lucide-react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

interface CompanionTrayProps {
  companions: PetProfile[];
  selectedPetId: string;
  onSelect: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}

export function CompanionTray({ companions, selectedPetId, onSelect, onToggleSummoned }: CompanionTrayProps) {
  const custom = companions.filter((pet) => pet.kind === "custom");
  const catalog = companions.filter((pet) => pet.kind === "catalog");

  return (
    <aside className="companion-tray">
      <section className="tray-section">
        <div className="section-title">
          <Sparkles size={16} />
          Martyn & Charles
        </div>
        <div className="pet-list">
          {custom.map((pet) => (
            <button
              className={`pet-card ${selectedPetId === pet.id ? "active" : ""}`}
              key={pet.id}
              type="button"
              onClick={() => onSelect(pet.id)}
            >
              <span className="pet-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>
                <strong>{pet.name}</strong>
                <small>{pet.breedLabel} · Locked</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="tray-section catalog-section">
        <div className="section-title">Original-style catalog</div>
        <div className="catalog-grid">
          {catalog.map((pet) => (
            <button
              className={`catalog-pet ${pet.summoned ? "summoned" : ""}`}
              key={pet.id}
              type="button"
              onClick={() => onToggleSummoned(pet.id, !pet.summoned)}
              aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name}`}
            >
              <span className="catalog-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>{pet.name}</span>
              {pet.summoned ? <Check size={14} /> : <Plus size={14} />}
            </button>
          ))}
        </div>
      </section>

      <button className="clear-catalog" type="button" onClick={() => catalog.forEach((pet) => onToggleSummoned(pet.id, false))}>
        <X size={15} />
        Hide catalog pets
      </button>
    </aside>
  );
}
```

- [ ] **Step 4: Create `PetStage`**

Create `src/components/PetStage.tsx`:

```tsx
import type { PointerEvent, RefObject } from "react";
import { PetAvatar } from "../PetAvatar";
import { getPetSize } from "../behaviorEngine";
import type { EngineSettings, PetProfile, PetRuntime } from "../types";

interface PetStageProps {
  stageRef: RefObject<HTMLDivElement>;
  companions: PetProfile[];
  runtimeMap: Map<string, PetRuntime>;
  selectedPetId: string;
  settings: EngineSettings;
  onPetPointerDown: (id: string, event: PointerEvent<HTMLButtonElement>) => void;
}

export function PetStage({ stageRef, companions, runtimeMap, selectedPetId, settings, onPetPointerDown }: PetStageProps) {
  return (
    <div className="pet-stage" ref={stageRef} aria-label="Desktop pet stage">
      <div className="stage-floor" />
      {companions.map((pet) => {
        const current = runtimeMap.get(pet.id);
        if (!current) {
          return null;
        }

        const size = getPetSize(pet, settings);
        const isSelected = pet.id === selectedPetId;

        return (
          <button
            className={`pet-actor ${isSelected ? "selected" : ""} behavior-${current.behavior}`}
            key={pet.id}
            style={{
              width: size,
              height: size * 0.84,
              transform: `translate3d(${current.x}px, ${current.y}px, 0) scaleX(${current.direction})`,
              ["--pet-phase" as string]: current.phase
            }}
            onPointerDown={(event) => onPetPointerDown(pet.id, event)}
            aria-label={`${pet.name}, ${current.behavior}`}
          >
            <span className="pet-hitbox">
              <PetAvatar pet={pet} behavior={current.behavior} />
            </span>
            {settings.showNames && (
              <span className="pet-name" style={{ transform: `scaleX(${current.direction})` }}>
                {pet.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create `CommandBar`**

Create `src/components/CommandBar.tsx`:

```tsx
import { Activity, Bell, Eye, EyeOff, Footprints, Home, Moon, MousePointer2, RotateCcw, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { Behavior, EngineSettings, PetProfile } from "../types";

interface CommandBarProps {
  selectedPet?: PetProfile;
  settings: EngineSettings;
  onSettingsChange: (patch: Partial<EngineSettings>) => void;
  onCommand: (behavior: Behavior, target?: "selected" | "all") => void;
  onCall: () => void;
  onReset: () => void;
}

export function CommandBar({ selectedPet, settings, onSettingsChange, onCommand, onCall, onReset }: CommandBarProps) {
  return (
    <footer className="behavior-bar">
      <div className="behavior-group">
        <span className="selected-label">{selectedPet?.name ?? "Companion"}</span>
        <IconButton label="Walk" onClick={() => onCommand("walk")}>
          <Footprints size={18} />
        </IconButton>
        <IconButton label="Sit" onClick={() => onCommand("sit")}>
          <MousePointer2 size={18} />
        </IconButton>
        <IconButton label="Nap" onClick={() => onCommand("sleep")}>
          <Moon size={18} />
        </IconButton>
        <IconButton label="Jump" onClick={() => onCommand("jump")}>
          <Zap size={18} />
        </IconButton>
        <IconButton label="Call" onClick={onCall}>
          <Bell size={18} />
        </IconButton>
      </div>

      <div className="behavior-group">
        <IconButton label="Reset positions" onClick={onReset}>
          <RotateCcw size={18} />
        </IconButton>
        <IconButton active={settings.physics} label="Physics" onClick={() => onSettingsChange({ physics: !settings.physics })}>
          <Activity size={18} />
        </IconButton>
        <IconButton active={settings.showNames} label="Name tags" onClick={() => onSettingsChange({ showNames: !settings.showNames })}>
          {settings.showNames ? <Eye size={18} /> : <EyeOff size={18} />}
        </IconButton>
        <IconButton active={settings.desktopMode} label="Desktop mode" onClick={() => onSettingsChange({ desktopMode: !settings.desktopMode })}>
          <Home size={18} />
        </IconButton>
        <IconButton active={settings.clickThrough} label="Click-through" onClick={() => onSettingsChange({ clickThrough: !settings.clickThrough })}>
          <ShieldCheck size={18} />
        </IconButton>
      </div>

      <div className="slider-group">
        <label>
          Scale
          <input
            type="range"
            min="0.75"
            max="1.35"
            step="0.01"
            value={settings.globalScale}
            onChange={(event) => onSettingsChange({ globalScale: Number(event.target.value) })}
          />
        </label>
        <label>
          Pace
          <input
            type="range"
            min="0.5"
            max="1.6"
            step="0.01"
            value={settings.globalSpeed}
            onChange={(event) => onSettingsChange({ globalSpeed: Number(event.target.value) })}
          />
        </label>
      </div>
    </footer>
  );
}

interface IconButtonProps {
  active?: boolean;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}

function IconButton({ active = false, label, onClick, children }: IconButtonProps) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} type="button" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}
```

- [ ] **Step 6: Wire components into `App.tsx`**

Import:

```ts
import { CommandBar } from "./components/CommandBar";
import { CompanionTray } from "./components/CompanionTray";
import { PetStage } from "./components/PetStage";
```

Replace the old `<PetRail />`, inline stage actor map, and `<BehaviorBar />` with:

```tsx
<CompanionTray
  companions={companions}
  selectedPetId={selectedPetId}
  onSelect={setSelectedPetId}
  onToggleSummoned={toggleSummoned}
/>

<PetStage
  stageRef={stageRef}
  companions={summonedCompanions}
  runtimeMap={petRuntimeMap}
  selectedPetId={selectedPetId}
  settings={settings}
  onPetPointerDown={onPetPointerDown}
/>

<CommandBar
  selectedPet={selectedPet}
  settings={settings}
  onSettingsChange={updateSettings}
  onCommand={commandPet}
  onCall={callSelectedPet}
  onReset={resetPets}
/>
```

Delete `PetRail`, `BehaviorBar`, `ColorField`, and local `IconButton` implementations from `App.tsx`.

Keep the existing local `IconButton` in `App.tsx` if `TopBar` still renders from `App.tsx`; `TopBar` depends on it for desktop, pin, minimize, and close controls.

- [ ] **Step 7: Rename rail CSS to companion tray and add catalog styles**

In `src/styles.css`, replace `.pet-rail` selectors with `.companion-tray`, keep `.pet-list`, `.pet-card`, `.pet-thumb`, and add:

```css
.catalog-section {
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.catalog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.catalog-pet {
  min-width: 0;
  min-height: 74px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 8px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 760;
  text-align: left;
}

.catalog-pet.summoned {
  border-color: rgb(42 157 149 / 0.42);
  background: #e9f7f5;
}

.catalog-thumb {
  width: 44px;
  height: 38px;
  display: grid;
  place-items: center;
  overflow: hidden;
}

.clear-catalog {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 760;
}
```

- [ ] **Step 8: Run component tests and build**

Run:

```powershell
npm test -- src/components/CompanionTray.test.tsx
npm run build
```

Expected: component tests PASS and build PASS.

- [ ] **Step 9: Commit Task 5**

Run:

```powershell
git add src/App.tsx src/components/CompanionTray.tsx src/components/CompanionTray.test.tsx src/components/PetStage.tsx src/components/CommandBar.tsx src/styles.css
git commit -m "feat: add companion tray and command UI"
```

---

### Task 6: Tool Drawer Extraction and Click-Through Desktop Recovery

**Files:**
- Create: `src/components/ToolDrawer.tsx`
- Modify: `src/App.tsx`
- Modify: `src/vite-env.d.ts`
- Modify: `src/styles.css`
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`

**Interfaces:**
- Consumes: existing notes, tasks, timer, and stats props from `App.tsx`.
- Produces: `ToolDrawer` component.
- Produces: `window.petEngine.onClickThroughChanged(callback: (enabled: boolean) => void): () => void`.

- [ ] **Step 1: Move `ToolDrawer` and supporting drawer helpers**

Create `src/components/ToolDrawer.tsx`:

```tsx
import {
  AlarmClock,
  Check,
  Circle,
  Clock3,
  Keyboard,
  ListTodo,
  NotebookPen,
  Pause,
  Play,
  Plus,
  TimerReset,
  Trash2
} from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { TaskItem } from "../types";

export type ToolTab = "notes" | "tasks" | "timer" | "stats";

interface ToolDrawerProps {
  activeTab: ToolTab;
  setActiveTab: (tab: ToolTab) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  tasks: TaskItem[];
  newTask: string;
  setNewTask: (value: string) => void;
  addTask: () => void;
  removeTask: (taskId: string) => void;
  setTasks: Dispatch<SetStateAction<TaskItem[]>>;
  timerSeconds: number;
  timerRunning: boolean;
  timerProgress: number;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  stats: {
    keys: number;
    activeSeconds: number;
    launches: number;
  };
}

export function ToolDrawer({
  activeTab,
  setActiveTab,
  notes,
  onNotesChange,
  tasks,
  newTask,
  setNewTask,
  addTask,
  removeTask,
  setTasks,
  timerSeconds,
  timerRunning,
  timerProgress,
  onTimerToggle,
  onTimerReset,
  stats
}: ToolDrawerProps) {
  return (
    <aside className="tool-drawer">
      <div className="drawer-head">
        <div>
          <h2>Tools</h2>
          <p>Notes, tasks, focus, counters</p>
        </div>
      </div>
      <div className="tab-row" role="tablist" aria-label="Tool tabs">
        <TabButton active={activeTab === "notes"} label="Notes" onClick={() => setActiveTab("notes")}>
          <NotebookPen size={17} />
        </TabButton>
        <TabButton active={activeTab === "tasks"} label="Tasks" onClick={() => setActiveTab("tasks")}>
          <ListTodo size={17} />
        </TabButton>
        <TabButton active={activeTab === "timer"} label="Timer" onClick={() => setActiveTab("timer")}>
          <AlarmClock size={17} />
        </TabButton>
        <TabButton active={activeTab === "stats"} label="Stats" onClick={() => setActiveTab("stats")}>
          <Keyboard size={17} />
        </TabButton>
      </div>

      <div className="drawer-body">
        {activeTab === "notes" && (
          <section className="tool-pane">
            <textarea value={notes} onChange={(event) => onNotesChange(event.target.value)} spellCheck />
          </section>
        )}

        {activeTab === "tasks" && (
          <section className="tool-pane">
            <form
              className="task-form"
              onSubmit={(event) => {
                event.preventDefault();
                addTask();
              }}
            >
              <input value={newTask} onChange={(event) => setNewTask(event.target.value)} placeholder="New task" />
              <button type="submit" aria-label="Add task">
                <Plus size={17} />
              </button>
            </form>
            <div className="task-list">
              {tasks.map((task) => (
                <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}>
                  <button
                    type="button"
                    className="check-button"
                    onClick={() =>
                      setTasks((current) =>
                        current.map((item) => (item.id === task.id ? { ...item, done: !item.done } : item))
                      )
                    }
                    aria-label={task.done ? "Mark incomplete" : "Mark complete"}
                  >
                    {task.done ? <Check size={15} /> : <Circle size={15} />}
                  </button>
                  <span>{task.text}</span>
                  <button type="button" className="trash-button" onClick={() => removeTask(task.id)} aria-label="Remove task">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "timer" && (
          <section className="tool-pane timer-pane">
            <div className="timer-ring" style={{ ["--timer-progress" as string]: timerProgress }}>
              <span>{formatTimer(timerSeconds)}</span>
            </div>
            <div className="timer-actions">
              <button type="button" onClick={onTimerToggle}>
                {timerRunning ? <Pause size={17} /> : <Play size={17} />}
                {timerRunning ? "Pause" : "Start"}
              </button>
              <button type="button" onClick={onTimerReset}>
                <TimerReset size={17} />
                Reset
              </button>
            </div>
          </section>
        )}

        {activeTab === "stats" && (
          <section className="tool-pane stats-grid">
            <Metric icon={<Keyboard size={18} />} label="Keys" value={stats.keys.toLocaleString()} />
            <Metric icon={<Clock3 size={18} />} label="Active" value={formatDuration(stats.activeSeconds)} />
            <Metric icon={<ListTodo size={18} />} label="Tasks" value={`${tasks.filter((task) => task.done).length}/${tasks.length}`} />
            <Metric icon={<ListTodo size={18} />} label="Launches" value={String(stats.launches)} />
          </section>
        )}
      </div>
    </aside>
  );
}

interface TabButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}

function TabButton({ active, label, onClick, children }: TabButtonProps) {
  return (
    <button type="button" className={`tab-button ${active ? "active" : ""}`} onClick={onClick} aria-label={label}>
      {children}
      <span>{label}</span>
    </button>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${remaining}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
```

Keep the JSX and class names unchanged so existing CSS still applies.

- [ ] **Step 2: Import `ToolDrawer` and `ToolTab` in `App.tsx`**

Add:

```ts
import { ToolDrawer, type ToolTab } from "./components/ToolDrawer";
```

Delete the moved drawer definitions from `App.tsx`.

- [ ] **Step 3: Add renderer click-through recovery typing**

Modify `src/vite-env.d.ts`:

```ts
interface Window {
  petEngine?: {
    minimize: () => Promise<void>;
    close: () => Promise<void>;
    setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
    setDesktopMode: (enabled: boolean) => Promise<boolean>;
    setClickThrough: (enabled: boolean) => Promise<boolean>;
    onClickThroughChanged: (callback: (enabled: boolean) => void) => () => void;
  };
}
```

- [ ] **Step 4: Wire click-through setting in `App.tsx`**

Add this effect near the desktop mode effects:

```ts
useEffect(() => {
  if (!window.petEngine) {
    return;
  }

  window.petEngine.setClickThrough(settings.clickThrough).catch(() => undefined);
}, [settings.clickThrough]);
```

Add this recovery listener:

```ts
useEffect(() => {
  if (!window.petEngine?.onClickThroughChanged) {
    return;
  }

  return window.petEngine.onClickThroughChanged((enabled) => {
    updateSettings({ clickThrough: enabled });
  });
}, [updateSettings]);
```

- [ ] **Step 5: Reset click-through on launch**

In the initial settings normalization path inside `App.tsx`, add this launch-only reset:

```ts
useEffect(() => {
  updateSettings({ clickThrough: false });
}, [updateSettings]);
```

This guarantees persisted `clickThrough: true` cannot trap the user after restart.

- [ ] **Step 6: Add Electron global shortcut recovery**

Modify `electron/main.cjs`:

```js
const { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme } = require("electron");
```

Add module-level state:

```js
let mainWindow;
let clickThroughEnabled = false;
```

Replace the existing `let mainWindow;` with the two-line state above.

After `createWindow();` inside the existing `app.whenReady().then(() => { ... })` callback, register:

```js
globalShortcut.register("Control+Alt+P", () => {
  clickThroughEnabled = false;
  if (!mainWindow) {
    return;
  }

  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setFocusable(true);
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("window:clickThroughChanged", false);
});
```

Add cleanup:

```js
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
```

Update `window:clickThrough` handler:

```js
ipcMain.handle("window:clickThrough", (_event, enabled) => {
  clickThroughEnabled = Boolean(enabled);
  mainWindow?.setIgnoreMouseEvents(clickThroughEnabled, { forward: true });
  mainWindow?.webContents.send("window:clickThroughChanged", clickThroughEnabled);
  return clickThroughEnabled;
});
```

At the end of `createWindow`, after loading the URL/file, reset:

```js
clickThroughEnabled = false;
mainWindow.setIgnoreMouseEvents(false);
mainWindow.setFocusable(true);
```

- [ ] **Step 7: Expose click-through recovery in preload**

Modify `electron/preload.cjs`:

```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petEngine", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("window:alwaysOnTop", enabled),
  setDesktopMode: (enabled) => ipcRenderer.invoke("window:desktopMode", enabled),
  setClickThrough: (enabled) => ipcRenderer.invoke("window:clickThrough", enabled),
  onClickThroughChanged: (callback) => {
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on("window:clickThroughChanged", listener);
    return () => ipcRenderer.removeListener("window:clickThroughChanged", listener);
  }
});
```

- [ ] **Step 8: Improve desktop-mode chrome recovery styling**

In `src/styles.css`, add:

```css
.desktop-mode .companion-tray,
.desktop-mode .tool-drawer,
.desktop-mode .stage-header,
.desktop-mode .behavior-bar,
.desktop-mode .panel-toggle {
  opacity: 0.04;
}

.desktop-mode .companion-tray:hover,
.desktop-mode .tool-drawer:hover,
.desktop-mode .stage-header:hover,
.desktop-mode .behavior-bar:hover,
.desktop-mode .panel-toggle:hover,
.desktop-mode:focus-within .companion-tray,
.desktop-mode:focus-within .tool-drawer,
.desktop-mode:focus-within .behavior-bar {
  opacity: 1;
}
```

- [ ] **Step 9: Run tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: all tests PASS and build PASS.

- [ ] **Step 10: Commit Task 6**

Run:

```powershell
git add src/App.tsx src/components/ToolDrawer.tsx src/vite-env.d.ts src/styles.css electron/main.cjs electron/preload.cjs
git commit -m "feat: add desktop click-through recovery"
```

---

### Task 7: Visual QA, Tuning, and Final Verification

**Files:**
- Modify: `src/data.ts`
- Modify: `src/PetAvatar.tsx`
- Modify: `src/styles.css`
- Modify: `src/behaviorEngine.ts`

**Interfaces:**
- Consumes: all completed app behavior.
- Produces: tuned sizes, weights, poses, and desktop behavior.

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
npm test
npm run build
```

Expected: all tests PASS and build PASS.

- [ ] **Step 2: Start the dev app**

Run:

```powershell
npm run dev
```

Expected: Vite starts on `http://127.0.0.1:5173` and Electron opens the app.

- [ ] **Step 3: Manual normal-mode checks**

Verify:

- Martyn and Charles are visible by default.
- Martyn and Charles have no name/species/color/profile editor.
- The companion tray shows "Martyn & Charles" and "Original-style catalog".
- Summon Bag, Patch, and at least one more catalog pet.
- Hide catalog pets.
- Drag Martyn and Charles and release them with physics enabled.
- Command Martyn through Walk, Sit, Nap, Jump, and Call.
- Command Charles through Walk, Sit, Nap, Jump, and Call.
- Notes, tasks, timer, and stats still work.

- [ ] **Step 4: Manual desktop-mode and click-through checks**

Verify:

- Desktop mode reduces chrome and keeps pets visible.
- Hover or focus restores chrome.
- Click-through toggle enables pass-through clicks.
- Press `Ctrl+Alt+P`.
- The window becomes focusable again.
- The app setting returns to click-through off.
- Close and relaunch the app.
- Click-through is off on launch.

- [ ] **Step 5: Tune custom cat feel**

Only change constants that affect the approved feel:

- In `src/data.ts`, adjust Martyn personality so `watchWeight` and `sitWeight` remain higher than `walkWeight`.
- In `src/data.ts`, adjust Charles personality so `sleepWeight` and `stretchWeight` remain higher than `walkWeight`.
- In `src/PetAvatar.tsx`, adjust Martyn shapes while preserving white body plus dark head/tail markings.
- In `src/PetAvatar.tsx`, adjust Charles shapes while preserving orange-and-white patches and long lounging silhouette.
- In `src/styles.css`, adjust animation timing without adding new dominant color palettes.
- In `src/behaviorEngine.ts`, adjust timing constants only when tests remain green.

- [ ] **Step 6: Re-run verification after tuning**

Run:

```powershell
npm test
npm run build
```

Expected: all tests PASS and build PASS.

- [ ] **Step 7: Commit Task 7**

Run:

```powershell
git add src/data.ts src/PetAvatar.tsx src/styles.css src/behaviorEngine.ts
git commit -m "polish: tune Martyn and Charles companion feel"
```

---

## Self-Review Checklist

- Spec coverage:
  - Locked Martyn and Charles: Task 1, Task 5.
  - Original-style catalog: Task 1, Task 5.
  - Behavior extraction and custom personalities: Task 2, Task 3, Task 7.
  - Authored custom avatars: Task 4, Task 7.
  - Compact utility UI: Task 5, Task 6.
  - Productivity tools retained: Task 6, Task 7.
  - Storage migration: Task 1.
  - Click-through recovery: Task 6, Task 7.
  - Build verification: every task, especially Task 7.

- Type consistency:
  - `PetProfile.avatar` is introduced in Task 1 and consumed in Task 4.
  - `EngineSettings.clickThrough` is introduced in Task 1 and consumed in Tasks 5 and 6.
  - `Behavior` includes `stretch` and `watch` before Task 2 uses them.
  - `CompanionState` exists before `App.tsx` migrates to it.

- Execution rule:
  - Implement one task at a time.
  - Run that task's verification commands before committing.
  - Do not continue to the next task after a failed test or failed build.

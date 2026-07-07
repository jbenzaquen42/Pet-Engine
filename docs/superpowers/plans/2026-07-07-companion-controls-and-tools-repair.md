# Companion Controls and Tools Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair companion controls, follow/pounce behavior, timer actions, tool pop-outs, and click targets for the Electron desktop pet app.

**Architecture:** Keep the existing Electron/Vite/React structure. Add small focused helpers/components for per-pet editing and tool pop-outs, while keeping movement rules in `behaviorEngine.ts` and hit testing in `overlay/hitTest.ts`.

**Tech Stack:** TypeScript, React 18, Vite, Vitest, Electron.

## Global Constraints

- Martyn and Charles remain built-in authored companions, but they can be hidden and shown like catalog pets.
- Built-in companions are not destructively deleted. Hiding them only sets `summoned: false`; they remain available to restore.
- The app supports selecting one or multiple companions for editing.
- Pet edits apply only to selected companions, not all cats or all pets.
- Energy is an editable per-pet activity-frequency control: lower energy means the pet rests more often, higher energy means it chooses movement behaviors more often.
- Charles defaults to high pace and high energy.
- Martyn defaults to medium pace and about 33% energy.
- Pounce visibly triggers for cats in follow mode when the cursor pauses near their assigned follow slot.
- Follow mode lets animals roam across the screen, not only along the bottom.
- Animals in follow mode avoid stacking on top of each other.
- Notes, To Do, and Timer can pop out from the drawer into separate floating tool surfaces.
- Timer controls must be reliably actionable in both drawer and pop-out surfaces: start, pause, reset, and duration changes.
- Toolbar icons and pet interactions get forgiving click targets without visually bloating the UI.
- Native Electron child windows are deferred until after in-panel floating surfaces are working reliably.
- Do not delete or revert unrelated existing worktree changes.

---

## File Structure

- Modify `src/data.ts` for authored default tuning.
- Modify `src/companionState.ts` and `src/companionState.test.ts` for preserving editable fields and selected-pet updates.
- Modify `src/components/CompanionTray.tsx` and `src/components/CompanionTray.test.tsx` for built-in summon/hide controls and multi-selection.
- Create `src/components/CompanionEditor.tsx` and `src/components/CompanionEditor.test.tsx` for per-pet and multi-pet editing.
- Modify `src/App.tsx` to own selected companion ids and wire editor updates.
- Modify `src/components/ToolDrawer.tsx` and `src/components/ToolDrawer.test.tsx` for pop-out actions.
- Create `src/components/ToolPopout.tsx` and `src/components/TimerTool.tsx` with tests if useful for focused coverage.
- Modify `src/behaviorEngine.ts`, `src/behaviorEngine.test.ts`, `src/overlay/useCompanionSimulation.ts`, `src/overlay/hitTest.ts`, and `src/overlay/hitTest.test.ts` for full-screen follow, pounce, separation, and padded hit targets.
- Modify `src/styles.css` and `src/overlay.css` only for the UI/hit-target styling required by the tasks.

---

### Task 1: Companion Defaults and State Helpers

**Files:**
- Modify: `src/data.ts`
- Modify: `src/companionState.ts`
- Modify: `src/companionState.test.ts`

**Interfaces:**
- Consumes: Existing `PetProfile`, `CompanionState`, `initialCompanionState`, `customCompanions`, `catalogCompanions`.
- Produces: `updateCompanionsByIds(companions: PetProfile[], ids: string[], patch: Partial<PetProfile> | ((pet: PetProfile) => Partial<PetProfile>)): PetProfile[]`
- Produces: `getSharedNumberValue(companions: PetProfile[], ids: string[], field: "size" | "speed" | "energy"): number | "mixed" | undefined`
- Produces: Normalization that preserves editable pet fields from stored state while restoring authored identity fields from defaults.

- [ ] **Step 1: Write failing companion state tests**

Add these tests to `src/companionState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { customCompanions, initialCompanionState } from "./data";
import {
  findSelectedCompanion,
  getSharedNumberValue,
  getSummonedCompanions,
  normalizeCompanionState,
  setCompanionSummoned,
  updateCompanionsByIds
} from "./companionState";

describe("companion state", () => {
  it("preserves authored companions while allowing them to be hidden", () => {
    const hidden = setCompanionSummoned(initialCompanionState.companions, "martyn", false);
    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: hidden });

    const martyn = normalized.companions.find((pet) => pet.id === "martyn");
    expect(martyn?.summoned).toBe(false);
    expect(martyn?.avatar).toBe("martyn");
    expect(martyn?.locked).toBe(false);
  });

  it("preserves editable fields from stored companions", () => {
    const edited = initialCompanionState.companions.map((pet) =>
      pet.id === "charles" ? { ...pet, size: 1.22, speed: 0.91, energy: 0.95, primaryColor: "#123456" } : pet
    );

    const normalized = normalizeCompanionState({ schemaVersion: 2, companions: edited });
    const charles = normalized.companions.find((pet) => pet.id === "charles")!;

    expect(charles.size).toBe(1.22);
    expect(charles.speed).toBe(0.91);
    expect(charles.energy).toBe(0.95);
    expect(charles.primaryColor).toBe("#123456");
    expect(charles.avatar).toBe("charles");
  });

  it("updates only selected companions", () => {
    const updated = updateCompanionsByIds(initialCompanionState.companions, ["martyn"], { energy: 0.75 });

    expect(updated.find((pet) => pet.id === "martyn")?.energy).toBe(0.75);
    expect(updated.find((pet) => pet.id === "charles")?.energy).toBe(customCompanions.find((pet) => pet.id === "charles")?.energy);
  });

  it("reports shared and mixed numeric values for multi-selection", () => {
    const shared = updateCompanionsByIds(initialCompanionState.companions, ["martyn", "charles"], { speed: 0.66 });

    expect(getSharedNumberValue(shared, ["martyn", "charles"], "speed")).toBe(0.66);
    expect(getSharedNumberValue(initialCompanionState.companions, ["martyn", "charles"], "energy")).toBe("mixed");
    expect(getSharedNumberValue(initialCompanionState.companions, [], "energy")).toBeUndefined();
  });

  it("defaults Charles higher than Martyn and Martyn near one-third energy", () => {
    const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
    const charles = customCompanions.find((pet) => pet.id === "charles")!;

    expect(charles.speed).toBeGreaterThan(martyn.speed);
    expect(charles.energy).toBeGreaterThan(martyn.energy);
    expect(martyn.energy).toBeGreaterThanOrEqual(0.32);
    expect(martyn.energy).toBeLessThanOrEqual(0.34);
  });

  it("still finds selected summoned companions", () => {
    const summoned = getSummonedCompanions(initialCompanionState.companions);
    expect(findSelectedCompanion(initialCompanionState.companions, summoned[0].id)?.id).toBe(summoned[0].id);
  });
});
```

If `src/companionState.test.ts` already contains overlapping tests, replace only the overlapping assertions and keep any unrelated tests.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/companionState.test.ts`

Expected: FAIL because `getSharedNumberValue` and `updateCompanionsByIds` are missing, locked defaults are still true, and authored energy/speed defaults do not match.

- [ ] **Step 3: Implement state helpers and defaults**

In `src/data.ts`, set Martyn and Charles to editable built-ins with these values:

```ts
// Martyn
locked: false,
speed: 0.52,
energy: 0.33,

// Charles
locked: false,
speed: 0.82,
energy: 0.88,
```

In `src/companionState.ts`, preserve editable fields during normalization and export the helpers:

```ts
const editablePetFields: Array<keyof PetProfile> = [
  "summoned",
  "name",
  "breedLabel",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "eyeColor",
  "size",
  "speed",
  "energy",
  "personality"
];

function mergeStoredCompanion(defaultPet: PetProfile, stored: PetProfile | undefined): PetProfile {
  const base = cloneCompanion(defaultPet);
  if (!stored) {
    return base;
  }

  const editable = editablePetFields.reduce<Partial<PetProfile>>((patch, field) => {
    if (field in stored) {
      return { ...patch, [field]: field === "personality" ? { ...stored.personality } : stored[field] };
    }
    return patch;
  }, {});

  return {
    ...base,
    ...editable,
    id: defaultPet.id,
    species: defaultPet.species,
    kind: defaultPet.kind,
    locked: false,
    avatar: defaultPet.avatar,
    pattern: defaultPet.pattern
  };
}

export function updateCompanionsByIds(
  companions: PetProfile[],
  ids: string[],
  patch: Partial<PetProfile> | ((pet: PetProfile) => Partial<PetProfile>)
) {
  const selected = new Set(ids);
  return companions.map((pet) => {
    if (!selected.has(pet.id)) {
      return pet;
    }
    const nextPatch = typeof patch === "function" ? patch(pet) : patch;
    return {
      ...pet,
      ...nextPatch,
      personality: nextPatch.personality ? { ...pet.personality, ...nextPatch.personality } : pet.personality
    };
  });
}

export function getSharedNumberValue(companions: PetProfile[], ids: string[], field: "size" | "speed" | "energy") {
  const selected = companions.filter((pet) => ids.includes(pet.id));
  if (selected.length === 0) {
    return undefined;
  }
  const first = selected[0][field];
  return selected.every((pet) => pet[field] === first) ? first : "mixed";
}
```

Update `normalizeCompanionState` to use:

```ts
const companions = [...customCompanions, ...catalogCompanions].map((defaultPet) =>
  mergeStoredCompanion(defaultPet, storedById.get(defaultPet.id))
);
```

- [ ] **Step 4: Run task tests**

Run: `npx vitest run src/companionState.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/data.ts src/companionState.ts src/companionState.test.ts
git commit -m "feat: add editable companion state helpers"
```

---

### Task 2: Companion Tray Multi-Select and Per-Pet Editor

**Files:**
- Modify: `src/components/CompanionTray.tsx`
- Modify: `src/components/CompanionTray.test.tsx`
- Create: `src/components/CompanionEditor.tsx`
- Create: `src/components/CompanionEditor.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes from Task 1: `updateCompanionsByIds`, `getSharedNumberValue`.
- Produces: `CompanionEditor` component.
- Produces: `CompanionTray` props `selectedPetIds: string[]`, `focusedPetId: string`, `onFocus: (id: string) => void`, `onSelectionChange: (ids: string[]) => void`.

- [ ] **Step 1: Write failing tray/editor tests**

Replace `src/components/CompanionTray.test.tsx` assertions with coverage for built-in summon controls and multi-select labels:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionTray } from "./CompanionTray";

describe("CompanionTray", () => {
  it("renders summon controls for authored and catalog companions", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        focusedPetId="martyn"
        selectedPetIds={["martyn"]}
        onFocus={() => undefined}
        onSelectionChange={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Hide Martyn");
    expect(markup).toContain("Hide Charles");
    expect(markup).toContain("Summon Bag");
    expect(markup).not.toContain("Locked");
  });

  it("renders multi-select controls", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        focusedPetId="martyn"
        selectedPetIds={["martyn", "charles"]}
        onFocus={() => undefined}
        onSelectionChange={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Edit Martyn");
    expect(markup).toContain("Edit Charles");
    expect(markup).toContain("2 selected");
  });
});
```

Create `src/components/CompanionEditor.test.tsx`:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionEditor } from "./CompanionEditor";

describe("CompanionEditor", () => {
  it("renders exact values for one selected pet", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor
        companions={initialCompanionState.companions}
        selectedPetIds={["martyn"]}
        onUpdateSelected={() => undefined}
      />
    );

    expect(markup).toContain("Martyn");
    expect(markup).toContain("Size");
    expect(markup).toContain("Pace");
    expect(markup).toContain("Energy");
    expect(markup).toContain("33%");
  });

  it("renders mixed values for multi-selection", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor
        companions={initialCompanionState.companions}
        selectedPetIds={["martyn", "charles"]}
        onUpdateSelected={() => undefined}
      />
    );

    expect(markup).toContain("2 selected");
    expect(markup).toContain("Mixed");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/CompanionTray.test.tsx src/components/CompanionEditor.test.tsx`

Expected: FAIL because `CompanionEditor` does not exist and `CompanionTray` props/UI do not match.

- [ ] **Step 3: Implement `CompanionEditor`**

Create `src/components/CompanionEditor.tsx`:

```tsx
import type { PetProfile } from "../types";
import { getSharedNumberValue } from "../companionState";

interface CompanionEditorProps {
  companions: PetProfile[];
  selectedPetIds: string[];
  onUpdateSelected: (patch: Partial<PetProfile>) => void;
}

const fields = [
  { key: "size", label: "Size", min: 0.65, max: 1.4, step: 0.01 },
  { key: "speed", label: "Pace", min: 0.2, max: 1, step: 0.01 },
  { key: "energy", label: "Energy", min: 0.05, max: 1, step: 0.01 }
] as const;

export function CompanionEditor({ companions, selectedPetIds, onUpdateSelected }: CompanionEditorProps) {
  const selected = companions.filter((pet) => selectedPetIds.includes(pet.id));
  if (selected.length === 0) {
    return (
      <section className="companion-editor" aria-label="Companion editor">
        <h2>No companion selected</h2>
      </section>
    );
  }

  const heading = selected.length === 1 ? selected[0].name : `${selected.length} selected`;

  return (
    <section className="companion-editor" aria-label="Companion editor">
      <div className="editor-head">
        <h2>{heading}</h2>
        <small>{selected.length === 1 ? selected[0].breedLabel : "Multi-edit"}</small>
      </div>
      <div className="editor-fields">
        {fields.map((field) => {
          const value = getSharedNumberValue(companions, selectedPetIds, field.key);
          const numeric = typeof value === "number" ? value : Number(field.min);
          return (
            <label className="range-field" key={field.key}>
              <span>
                {field.label}
                <strong>{value === "mixed" ? "Mixed" : `${Math.round(numeric * 100)}%`}</strong>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={numeric}
                onChange={(event) => onUpdateSelected({ [field.key]: Number(event.target.value) } as Partial<PetProfile>)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update `CompanionTray`**

Change `CompanionTrayProps` to:

```ts
interface CompanionTrayProps {
  companions: PetProfile[];
  focusedPetId: string;
  selectedPetIds: string[];
  onFocus: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}
```

Render one section for authored companions and one for catalog companions. Each card has:

```tsx
<input
  type="checkbox"
  checked={selectedPetIds.includes(pet.id)}
  onChange={(event) => {
    const next = event.target.checked
      ? [...selectedPetIds, pet.id]
      : selectedPetIds.filter((id) => id !== pet.id);
    onSelectionChange(next.length ? next : [pet.id]);
  }}
  aria-label={`Edit ${pet.name}`}
/>
```

Each card still focuses on click:

```tsx
onClick={() => onFocus(pet.id)}
```

Add a summon/hide button for every pet:

```tsx
<button
  className="summon-button"
  type="button"
  onClick={(event) => {
    event.stopPropagation();
    onToggleSummoned(pet.id, !pet.summoned);
  }}
  aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name}`}
>
  {pet.summoned ? <Check size={14} /> : <Plus size={14} />}
</button>
```

Render selected count:

```tsx
<small className="selection-count">{selectedPetIds.length} selected</small>
```

- [ ] **Step 5: Wire App state**

In `src/App.tsx`:

- Replace `selectedPetId` with `focusedPetId` plus `selectedPetIds`.
- Keep command behavior targeting `focusedPetId`.
- Keep `findSelectedCompanion(companions, focusedPetId)` for command label.
- Add:

```ts
const [focusedPetId, setFocusedPetId] = useState(() => summonedCompanions[0]?.id ?? "martyn");
const [selectedPetIds, setSelectedPetIds] = useState<string[]>(() => [summonedCompanions[0]?.id ?? "martyn"]);

const updateSelectedCompanions = useCallback(
  (patch: Partial<PetProfile>) => {
    setCompanionState((current) => ({
      ...current,
      companions: updateCompanionsByIds(current.companions, selectedPetIds, patch)
    }));
  },
  [selectedPetIds, setCompanionState]
);
```

When focused pet becomes unsummoned, focus the first summoned pet if available; do not force the hidden pet back to summoned.

Render `CompanionEditor` under `CompanionTray`.

- [ ] **Step 6: Add focused CSS**

Add to `src/styles.css`:

```css
.selection-count {
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.pet-select {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
}

.pet-select input {
  width: 18px;
  height: 18px;
  accent-color: var(--teal);
}

.summon-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  color: var(--teal-dark);
  cursor: pointer;
}

.companion-editor {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgb(216 224 226 / 0.86);
  border-radius: 8px;
  background: rgb(251 252 252 / 0.9);
  box-shadow: 0 8px 24px rgb(21 43 48 / 0.06);
}

.editor-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.editor-head h2 {
  margin: 0;
  font-size: 15px;
}

.editor-head small {
  color: var(--muted);
  font-weight: 700;
}

.editor-fields {
  display: grid;
  gap: 10px;
}

.range-field span {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
```

Adjust `.pet-card` grid columns so checkbox and summon button fit.

- [ ] **Step 7: Run task tests**

Run: `npx vitest run src/components/CompanionTray.test.tsx src/components/CompanionEditor.test.tsx src/companionState.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

Run:

```bash
git add src/App.tsx src/components/CompanionTray.tsx src/components/CompanionTray.test.tsx src/components/CompanionEditor.tsx src/components/CompanionEditor.test.tsx src/styles.css
git commit -m "feat: add companion multi-edit controls"
```

---

### Task 3: Timer Actions and Tool Pop-Out Panels

**Files:**
- Modify: `src/components/ToolDrawer.tsx`
- Modify: `src/components/ToolDrawer.test.tsx`
- Create: `src/components/TimerTool.tsx`
- Create: `src/components/ToolPopout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `ToolPopout` component for in-panel floating surfaces.
- Produces: `TimerTool` component with shared timer controls.
- `ToolDrawer` gains `poppedTools: ToolTab[]`, `onPopTool: (tab: ToolTab) => void`, `timerMinutes: number`, `onTimerMinutesChange: (minutes: number) => void`.

- [ ] **Step 1: Write failing tests**

Create `src/components/TimerTool.test.tsx`:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimerTool } from "./TimerTool";

describe("TimerTool", () => {
  it("renders large timer actions and duration controls", () => {
    const markup = renderToStaticMarkup(
      <TimerTool
        timerSeconds={25 * 60}
        timerRunning={false}
        timerProgress={0}
        timerMinutes={25}
        onTimerToggle={() => undefined}
        onTimerReset={() => undefined}
        onTimerMinutesChange={() => undefined}
      />
    );

    expect(markup).toContain("25:00");
    expect(markup).toContain("Start timer");
    expect(markup).toContain("Reset timer");
    expect(markup).toContain("Decrease minutes");
    expect(markup).toContain("Increase minutes");
  });
});
```

Update `src/components/ToolDrawer.test.tsx` so render helper passes the new props and add:

```ts
it("renders pop-out controls for notes tasks and timer", () => {
  const markup = renderDrawer("timer");

  expect(markup).toContain("Pop out Notes");
  expect(markup).toContain("Pop out Tasks");
  expect(markup).toContain("Pop out Timer");
});
```

Create `src/components/ToolPopout.test.tsx`:

```ts
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToolPopout } from "./ToolPopout";

describe("ToolPopout", () => {
  it("renders a floating tool panel with close control", () => {
    const markup = renderToStaticMarkup(
      <ToolPopout title="Timer" onClose={() => undefined}>
        <p>Body</p>
      </ToolPopout>
    );

    expect(markup).toContain("Timer");
    expect(markup).toContain("Close Timer");
    expect(markup).toContain("Body");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx`

Expected: FAIL because new components/props are missing.

- [ ] **Step 3: Create `TimerTool`**

Create `src/components/TimerTool.tsx`:

```tsx
import { Minus, Pause, Play, Plus, TimerReset } from "lucide-react";

interface TimerToolProps {
  timerSeconds: number;
  timerRunning: boolean;
  timerProgress: number;
  timerMinutes: number;
  onTimerToggle: () => void;
  onTimerReset: () => void;
  onTimerMinutesChange: (minutes: number) => void;
}

export function TimerTool({
  timerSeconds,
  timerRunning,
  timerProgress,
  timerMinutes,
  onTimerToggle,
  onTimerReset,
  onTimerMinutesChange
}: TimerToolProps) {
  const setMinutes = (minutes: number) => onTimerMinutesChange(Math.min(180, Math.max(1, minutes)));

  return (
    <section className="tool-pane timer-pane">
      <div className="timer-ring" style={{ ["--timer-progress" as string]: timerProgress }}>
        <span>{formatTimer(timerSeconds)}</span>
      </div>
      <div className="timer-duration">
        <button type="button" onClick={() => setMinutes(timerMinutes - 5)} aria-label="Decrease minutes">
          <Minus size={17} />
        </button>
        <label>
          Minutes
          <input
            type="number"
            min="1"
            max="180"
            value={timerMinutes}
            onChange={(event) => setMinutes(Number(event.target.value) || 1)}
          />
        </label>
        <button type="button" onClick={() => setMinutes(timerMinutes + 5)} aria-label="Increase minutes">
          <Plus size={17} />
        </button>
      </div>
      <div className="timer-actions">
        <button type="button" className="timer-action primary" onClick={onTimerToggle} aria-label={timerRunning ? "Pause timer" : "Start timer"}>
          {timerRunning ? <Pause size={18} /> : <Play size={18} />}
          {timerRunning ? "Pause" : "Start"}
        </button>
        <button type="button" className="timer-action" onClick={onTimerReset} aria-label="Reset timer">
          <TimerReset size={18} />
          Reset
        </button>
      </div>
    </section>
  );
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 4: Create `ToolPopout`**

Create `src/components/ToolPopout.tsx`:

```tsx
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ToolPopoutProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function ToolPopout({ title, onClose, children }: ToolPopoutProps) {
  return (
    <aside className="tool-popout" aria-label={`${title} pop-out`}>
      <header className="tool-popout-head">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label={`Close ${title}`}>
          <X size={17} />
        </button>
      </header>
      <div className="tool-popout-body">{children}</div>
    </aside>
  );
}
```

- [ ] **Step 5: Refactor `ToolDrawer`**

Import `ExternalLink` from `lucide-react`, `TimerTool`, and update props. Add a pop-out icon button to Notes, Tasks, and Timer tabs:

```tsx
<button type="button" className="pop-tool-button" onClick={() => onPopTool("timer")} aria-label="Pop out Timer">
  <ExternalLink size={16} />
</button>
```

Use `TimerTool` for the timer pane instead of inline timer markup.

Remove the local `formatTimer` function from `ToolDrawer.tsx`.

- [ ] **Step 6: Wire App pop-outs and timer duration**

In `src/App.tsx`, add:

```ts
const [timerMinutes, setTimerMinutes] = useState(25);
const [poppedTools, setPoppedTools] = useState<ToolTab[]>([]);
const popTool = useCallback((tab: ToolTab) => {
  setPoppedTools((current) => (current.includes(tab) ? current : [...current, tab]));
}, []);
const closePoppedTool = useCallback((tab: ToolTab) => {
  setPoppedTools((current) => current.filter((item) => item !== tab));
}, []);
const updateTimerMinutes = useCallback((minutes: number) => {
  const bounded = Math.min(180, Math.max(1, minutes));
  setTimerMinutes(bounded);
  setTimerRunning(false);
  setTimerSeconds(bounded * 60);
}, []);
```

Change timer reset to:

```ts
setTimerSeconds(timerMinutes * 60);
```

Render `ToolPopout` instances for popped notes/tasks/timer using the same state and callbacks as the drawer.

- [ ] **Step 7: Add CSS for reliable timer controls and pop-outs**

Add to `src/styles.css`:

```css
.pop-tool-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  color: var(--muted);
  cursor: pointer;
}

.tool-popout {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 50;
  width: min(360px, calc(100vw - 36px));
  max-height: min(520px, calc(100vh - 36px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-strong);
  box-shadow: 0 20px 60px rgb(21 43 48 / 0.24);
}

.tool-popout-head {
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 14px;
  border-bottom: 1px solid var(--line);
}

.tool-popout-head h2 {
  margin: 0;
  font-size: 15px;
}

.tool-popout-head button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  cursor: pointer;
}

.tool-popout-body {
  min-height: 0;
  padding: 12px;
  overflow: auto;
}

.timer-duration {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 40px;
  align-items: end;
  gap: 8px;
  width: 100%;
}

.timer-duration button,
.timer-action {
  min-height: 42px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  cursor: pointer;
}

.timer-duration label {
  display: grid;
  gap: 5px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.timer-duration input {
  height: 42px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: 7px;
}

.timer-action {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 14px;
  font-weight: 760;
}

.timer-action.primary {
  color: white;
  border-color: var(--teal);
  background: var(--teal);
}
```

- [ ] **Step 8: Run task tests**

Run: `npx vitest run src/components/ToolDrawer.test.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.test.tsx`

Expected: PASS.

- [ ] **Step 9: Commit**

Run:

```bash
git add src/App.tsx src/components/ToolDrawer.tsx src/components/ToolDrawer.test.tsx src/components/TimerTool.tsx src/components/TimerTool.test.tsx src/components/ToolPopout.tsx src/components/ToolPopout.test.tsx src/styles.css
git commit -m "feat: add reliable timer and tool popouts"
```

---

### Task 4: Full-Screen Follow, Pounce, Separation, and Hit Targets

**Files:**
- Modify: `src/behaviorEngine.ts`
- Modify: `src/behaviorEngine.test.ts`
- Modify: `src/overlay/useCompanionSimulation.ts`
- Modify: `src/overlay/hitTest.ts`
- Modify: `src/overlay/hitTest.test.ts`
- Modify: `src/Overlay.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Produces: `FollowContext` with optional `targetIndex?: number`.
- Produces: `getFollowTarget(cursor: { x: number; y: number }, index: number, size: number, bounds: StageBounds): { x: number; y: number }`.
- Produces: `separateOverlaps(runtimes: PetRuntime[], pets: PetProfile[], settings: EngineSettings, bounds: StageBounds): PetRuntime[]`.
- Produces: `findPetAtPoint(point: Point, boxes: PetBox[], padding = 0): string | null`.

- [ ] **Step 1: Write failing behavior and hit-test tests**

Add to `src/behaviorEngine.test.ts`:

```ts
import { separateOverlaps, getFollowTarget } from "./behaviorEngine";

it("assigns separate follow slots around the cursor", () => {
  const first = getFollowTarget({ x: 450, y: 260 }, 0, 120, bounds);
  const second = getFollowTarget({ x: 450, y: 260 }, 1, 120, bounds);

  expect(first).not.toEqual(second);
});

it("follow mode moves toward cursor y as well as x", () => {
  const next = advanceCompanion(
    runtimeFor("martyn", { x: 100, y: 400, behavior: "idle" }),
    martyn,
    initialSettings,
    bounds,
    16.67,
    1000,
    () => 0.5,
    { active: true, pounce: false, cursor: { x: 700, y: 120 }, cursorIdleMs: 0, targetIndex: 0 }
  );

  expect(next.x).toBeGreaterThan(100);
  expect(next.y).toBeLessThan(400);
});

it("separates overlapping follow-mode pets", () => {
  const separated = separateOverlaps(
    [
      runtimeFor("martyn", { x: 300, y: 200 }),
      runtimeFor("charles", { x: 305, y: 205 })
    ],
    [martyn, charles],
    initialSettings,
    bounds
  );

  expect(Math.hypot(separated[0].x - separated[1].x, separated[0].y - separated[1].y)).toBeGreaterThan(20);
});

it("pounces near the assigned follow slot when the cursor idles", () => {
  const stalking = advanceCompanion(
    runtimeFor("martyn", { x: 370, y: 210, behavior: "watch", stateStartedAt: 0 }),
    martyn,
    initialSettings,
    bounds,
    16.67,
    100,
    () => 0.5,
    { active: true, pounce: true, cursor: { x: 450, y: 260 }, cursorIdleMs: 1500, targetIndex: 0 }
  );

  expect(stalking.behavior).toBe("stalk");
});
```

Update `src/overlay/hitTest.test.ts`:

```ts
it("supports padded hit boxes", () => {
  expect(findPetAtPoint({ x: -8, y: 10 }, boxes, 10)).toBe("martyn");
  expect(findPetAtPoint({ x: -20, y: 10 }, boxes, 10)).toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/behaviorEngine.test.ts src/overlay/hitTest.test.ts`

Expected: FAIL because helper functions/padded signature/full-Y follow do not exist.

- [ ] **Step 3: Implement follow target slots**

In `src/behaviorEngine.ts`, extend `FollowContext`:

```ts
targetIndex?: number;
```

Add:

```ts
const FOLLOW_SLOTS = [
  { x: -0.75, y: -0.35 },
  { x: 0.75, y: -0.35 },
  { x: -0.75, y: 0.55 },
  { x: 0.75, y: 0.55 },
  { x: 0, y: -1.1 },
  { x: 0, y: 1.05 }
];

export function getFollowTarget(cursor: { x: number; y: number }, index: number, size: number, bounds: StageBounds) {
  const ring = Math.floor(index / FOLLOW_SLOTS.length);
  const slot = FOLLOW_SLOTS[index % FOLLOW_SLOTS.length];
  const distance = size * (0.72 + ring * 0.45);
  const x = clamp(cursor.x - size / 2 + slot.x * distance, 8, Math.max(8, bounds.width - size - 8));
  const y = clamp(cursor.y - size / 2 + slot.y * distance, 16, Math.max(16, bounds.height - size - 16));
  return { x, y };
}
```

- [ ] **Step 4: Update `applyFollow` for 2D movement and pounce**

Inside `applyFollow`, replace ground-only target logic with:

```ts
const target = getFollowTarget(cursor, follow.targetIndex ?? 0, size, _bounds);
const dx = target.x - next.x;
const dy = target.y - next.y;
const dist = Math.hypot(dx, dy);
const arrive = Math.max(30, size * 0.28);
```

For movement:

```ts
const step = Math.min(dist, (1.2 + pet.speed * 1.7) * settings.globalSpeed * (delta / 16.67));
const direction: 1 | -1 = dx >= 0 ? 1 : -1;
const ratio = dist === 0 ? 0 : step / dist;
return {
  ...next,
  x: clamp(next.x + dx * ratio, 8, maxX),
  y: clamp(next.y + dy * ratio, 16, Math.max(16, _bounds.height - size - 16)),
  direction,
  behavior,
  stateStartedAt
};
```

Keep `stalk` and `pounce`, but make them use `target.y`, not `ground`.

- [ ] **Step 5: Implement separation**

Add to `src/behaviorEngine.ts`:

```ts
export function separateOverlaps(
  runtimes: PetRuntime[],
  pets: PetProfile[],
  settings: EngineSettings,
  bounds: StageBounds
) {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const next = runtimes.map((runtime) => ({ ...runtime }));

  for (let i = 0; i < next.length; i += 1) {
    for (let j = i + 1; j < next.length; j += 1) {
      const aPet = petById.get(next[i].id);
      const bPet = petById.get(next[j].id);
      if (!aPet || !bPet) {
        continue;
      }
      const aSize = getPetSize(aPet, settings);
      const bSize = getPetSize(bPet, settings);
      const minDist = (aSize + bSize) * 0.34;
      const dx = next[j].x - next[i].x;
      const dy = next[j].y - next[i].y;
      const dist = Math.max(1, Math.hypot(dx, dy));
      if (dist >= minDist) {
        continue;
      }
      const push = (minDist - dist) / 2;
      const ux = dx / dist;
      const uy = dy / dist;
      next[i].x = clamp(next[i].x - ux * push, 8, Math.max(8, bounds.width - aSize - 8));
      next[i].y = clamp(next[i].y - uy * push, 16, Math.max(16, bounds.height - aSize - 16));
      next[j].x = clamp(next[j].x + ux * push, 8, Math.max(8, bounds.width - bSize - 8));
      next[j].y = clamp(next[j].y + uy * push, 16, Math.max(16, bounds.height - bSize - 16));
    }
  }

  return next;
}
```

- [ ] **Step 6: Wire target index and separation in simulation**

In `src/overlay/useCompanionSimulation.ts`, when mapping runtimes, pass a follow context with target index:

```ts
const targetIndex = companions.findIndex((pet) => pet.id === petRuntime.id);
const petFollow = follow.active ? { ...follow, targetIndex } : follow;
return advanceCompanion(petRuntime, pet, settings, bounds, delta, now, Math.random, petFollow);
```

After mapping, if follow is active:

```ts
const advanced = seeded.map(...);
return follow.active ? separateOverlaps(advanced, companions, settings, bounds) : advanced;
```

- [ ] **Step 7: Add padded hit testing**

Update `src/overlay/hitTest.ts`:

```ts
export function findPetAtPoint(point: Point, boxes: PetBox[], padding = 0): string | null {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index];
    const inside =
      point.x >= box.x - padding &&
      point.x <= box.x + box.width + padding &&
      point.y >= box.y - padding &&
      point.y <= box.y + box.height + padding;
    if (inside) {
      return box.id;
    }
  }
  return null;
}
```

Update `src/Overlay.tsx` pointer move to call:

```ts
findPetAtPoint({ x: event.clientX, y: event.clientY }, boxesRef.current, 14)
```

- [ ] **Step 8: Enlarge icon hit targets**

In `src/styles.css`, update `.icon-button` to at least:

```css
.icon-button {
  width: 40px;
  height: 40px;
}
```

Update compact button families such as `.check-button`, `.trash-button`, and `.tab-button` to `min-height: 40px` where they are currently below 40.

- [ ] **Step 9: Run task tests**

Run: `npx vitest run src/behaviorEngine.test.ts src/overlay/hitTest.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit**

Run:

```bash
git add src/behaviorEngine.ts src/behaviorEngine.test.ts src/overlay/useCompanionSimulation.ts src/overlay/hitTest.ts src/overlay/hitTest.test.ts src/Overlay.tsx src/styles.css
git commit -m "feat: improve follow pounce and hit targets"
```

---

### Task 5: Integration Verification and Package Build

**Files:**
- Modify only files needed to fix integration issues found by verification.

**Interfaces:**
- Consumes all prior task outputs.
- Produces a passing test suite and production build.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Fix any integration failures**

If tests fail, inspect the exact failing assertions and make the smallest code changes needed. Do not add unrelated refactors.

- [ ] **Step 3: Run TypeScript/Vite build**

Run: `npm run build`

Expected: TypeScript check and Vite build succeed.

- [ ] **Step 4: Run package build**

Run: `npm run dist`

Expected: `release/Pet Engine Setup 0.1.0.exe` and `release/win-unpacked/Pet Engine.exe` are rebuilt successfully.

- [ ] **Step 5: Verify packaged renderer assets remain relative**

Run:

```powershell
@'
const asar = require('@electron/asar');
for (const file of ['dist/index.html', 'dist/overlay.html']) {
  const content = asar.extractFile('release/win-unpacked/resources/app.asar', file).toString('utf8');
  const hasRootAsset = /(?:src|href)="\/assets\//.test(content);
  const hasRelativeAsset = /(?:src|href)="\.\/assets\//.test(content);
  console.log(`${file}: relativeAssets=${hasRelativeAsset} rootAssets=${hasRootAsset}`);
  if (!hasRelativeAsset || hasRootAsset) process.exitCode = 1;
}
'@ | node -
```

Expected:

```text
dist/index.html: relativeAssets=true rootAssets=false
dist/overlay.html: relativeAssets=true rootAssets=false
```

- [ ] **Step 6: Commit fixes if any**

If Step 2 required changes, commit them:

```bash
git add <changed-files>
git commit -m "fix: resolve companion controls integration"
```

If no changes were required, do not create an empty commit.

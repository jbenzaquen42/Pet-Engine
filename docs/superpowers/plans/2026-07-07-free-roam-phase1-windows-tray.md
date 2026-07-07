# Free-Roam Phase 1: Windows, Tray, and Desktop Roaming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Pet Engine into a full-screen transparent overlay where Martyn, Charles, and catalog pets roam the real desktop, plus a compact control panel that docks to the system tray, with click-through hit-testing so pets are grabbable but the desktop stays usable.

**Architecture:** Two Vite HTML entries (`index.html` = panel, `overlay.html` = overlay) built as a multi-page app. Electron main creates both `BrowserWindow`s and a tray, and relays a state snapshot from the panel (source of truth, owns localStorage) to the overlay (pure simulation + view). The overlay recomputes a hit-test on every forwarded `mousemove` and asks main to toggle `setIgnoreMouseEvents` so only pets capture the mouse. Pure logic (hit-test math, snapshot normalization) is unit-tested with Vitest; Electron window/tray wiring is verified by build plus a manual smoke checklist.

**Tech Stack:** Electron 32, Vite 5 (multi-page), React 18, TypeScript 5, lucide-react, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-07-free-roam-desktop-companions-design.md` (Architecture, Window architecture, State + data flow, Follow-mode-independent hit-testing).

---

## Scope of this plan (Phase 1 only)

In scope: overlay/panel window split, Vite multi-page, snapshot IPC sync, tray with menu, hit-test click-through, pets walk the real desktop work area, grab & drag pets on the overlay, panel minimize/close → tray, panel position memory.

Deferred to later phase plans: articulated rigs (Phase 2), follow mode + pounce + cursor pump (Phase 3), toss physics / zoomies / climb / pet-to-pet / fountain (Phase 4), panel visual redesign / launch-at-login / installer (Phase 5).

## Task Completion Checklist

- [ ] Task 1: Snapshot contract and hit-test math (pure, TDD)
- [ ] Task 2: Overlay HTML entry and Vite multi-page build
- [ ] Task 3: Reusable companion simulation hook
- [ ] Task 4: Electron two-window shell, tray, and preload bridge
- [ ] Task 5: Panel broadcasts snapshot; overlay consumes and roams
- [ ] Task 6: Panel tray docking, position memory, and manual QA

---

## File Structure

- Create `src/shared/overlayBridge.ts` — `OverlaySnapshot` type + `normalizeSnapshot` (defensive parse of IPC payloads).
- Create `src/shared/overlayBridge.test.ts` — snapshot normalization tests.
- Create `src/overlay/hitTest.ts` — `PetBox`, `Point`, `findPetAtPoint`.
- Create `src/overlay/hitTest.test.ts` — hit-test math tests.
- Create `src/overlay/useCompanionSimulation.ts` — reusable rAF simulation + drag hook (extracted from `App.tsx`).
- Create `overlay.html` — overlay entry document.
- Create `src/overlay-main.tsx` — overlay React root.
- Create `src/Overlay.tsx` — overlay component: consumes snapshot, runs simulation, renders roaming pets, drives hit-test click-through, drags pets.
- Create `src/overlay.css` — transparent full-screen overlay styling.
- Modify `vite.config.ts` — multi-page `rollupOptions.input` for `index.html` + `overlay.html`.
- Modify `electron/main.cjs` — create overlay + panel windows, tray, snapshot relay, mouse-ignore toggle, panel-to-tray hide.
- Modify `electron/preload.cjs` — expose snapshot send/receive/request, overlay interactivity toggle, panel window controls, tray-driven events.
- Modify `src/vite-env.d.ts` — types for the new preload surface (both windows share one `Window.petEngine`).
- Modify `src/App.tsx` — broadcast snapshot on companion/settings change; respond to snapshot requests; minimize/close now hide-to-tray; remove the in-panel `PetStage` (pets live on the overlay now) while keeping tray/commands.

---

### Task 1: Snapshot contract and hit-test math (pure, TDD)

**Files:**
- Create: `src/shared/overlayBridge.ts`
- Create: `src/shared/overlayBridge.test.ts`
- Create: `src/overlay/hitTest.ts`
- Create: `src/overlay/hitTest.test.ts`

**Interfaces:**
- Produces: `OverlaySnapshot`, `normalizeSnapshot(value: unknown): OverlaySnapshot`.
- Produces: `PetBox`, `Point`, `findPetAtPoint(point: Point, boxes: PetBox[]): string | null`.
- Consumed by: Tasks 3, 4, 5.

- [ ] **Step 1: Write the failing snapshot tests**

Create `src/shared/overlayBridge.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { initialSettings } from "../data";
import { getSummonedCompanions } from "../companionState";
import { initialCompanionState } from "../data";
import { normalizeSnapshot } from "./overlayBridge";

const summoned = getSummonedCompanions(initialCompanionState.companions);

describe("normalizeSnapshot", () => {
  it("returns an empty, safe snapshot for junk input", () => {
    const snapshot = normalizeSnapshot(null);
    expect(snapshot.companions).toEqual([]);
    expect(snapshot.settings).toEqual(initialSettings);
  });

  it("passes through a valid snapshot", () => {
    const snapshot = normalizeSnapshot({ companions: summoned, settings: initialSettings });
    expect(snapshot.companions.map((pet) => pet.id)).toEqual(summoned.map((pet) => pet.id));
    expect(snapshot.settings.physics).toBe(initialSettings.physics);
  });

  it("fills missing settings fields from defaults", () => {
    const snapshot = normalizeSnapshot({ companions: [], settings: { physics: false } });
    expect(snapshot.settings.physics).toBe(false);
    expect(snapshot.settings.globalScale).toBe(initialSettings.globalScale);
  });

  it("drops companions that are not objects with an id", () => {
    const snapshot = normalizeSnapshot({ companions: [summoned[0], null, { name: "x" }], settings: initialSettings });
    expect(snapshot.companions).toHaveLength(1);
    expect(snapshot.companions[0].id).toBe(summoned[0].id);
  });
});
```

- [ ] **Step 2: Run the failing snapshot tests**

Run:

```powershell
npm test -- src/shared/overlayBridge.test.ts
```

Expected: FAIL because `src/shared/overlayBridge.ts` does not exist.

- [ ] **Step 3: Implement the snapshot contract**

Create `src/shared/overlayBridge.ts`:

```ts
import { initialSettings } from "../data";
import type { EngineSettings, PetProfile } from "../types";

export interface OverlaySnapshot {
  companions: PetProfile[];
  settings: EngineSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeSettings(value: unknown): EngineSettings {
  if (!isRecord(value)) {
    return { ...initialSettings };
  }
  return { ...initialSettings, ...(value as Partial<EngineSettings>) };
}

function normalizeCompanions(value: unknown): PetProfile[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((pet): pet is PetProfile => isRecord(pet) && typeof (pet as PetProfile).id === "string");
}

export function normalizeSnapshot(value: unknown): OverlaySnapshot {
  if (!isRecord(value)) {
    return { companions: [], settings: { ...initialSettings } };
  }
  return {
    companions: normalizeCompanions(value.companions),
    settings: normalizeSettings(value.settings)
  };
}
```

- [ ] **Step 4: Run the snapshot tests to verify they pass**

Run:

```powershell
npm test -- src/shared/overlayBridge.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing hit-test tests**

Create `src/overlay/hitTest.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findPetAtPoint, type PetBox } from "./hitTest";

const boxes: PetBox[] = [
  { id: "martyn", x: 0, y: 0, width: 100, height: 100 },
  { id: "charles", x: 50, y: 50, width: 100, height: 100 }
];

describe("findPetAtPoint", () => {
  it("returns null when the point is over no pet", () => {
    expect(findPetAtPoint({ x: 400, y: 400 }, boxes)).toBeNull();
  });

  it("returns the pet under the point", () => {
    expect(findPetAtPoint({ x: 10, y: 10 }, boxes)).toBe("martyn");
  });

  it("prefers the last (top-most) pet when boxes overlap", () => {
    expect(findPetAtPoint({ x: 70, y: 70 }, boxes)).toBe("charles");
  });

  it("treats edges as inside", () => {
    expect(findPetAtPoint({ x: 0, y: 0 }, boxes)).toBe("martyn");
    expect(findPetAtPoint({ x: 100, y: 100 }, boxes)).toBe("martyn");
  });
});
```

- [ ] **Step 6: Run the failing hit-test tests**

Run:

```powershell
npm test -- src/overlay/hitTest.test.ts
```

Expected: FAIL because `src/overlay/hitTest.ts` does not exist.

- [ ] **Step 7: Implement the hit-test math**

Create `src/overlay/hitTest.ts`:

```ts
export interface Point {
  x: number;
  y: number;
}

export interface PetBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function findPetAtPoint(point: Point, boxes: PetBox[]): string | null {
  for (let index = boxes.length - 1; index >= 0; index -= 1) {
    const box = boxes[index];
    const inside =
      point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
    if (inside) {
      return box.id;
    }
  }
  return null;
}
```

- [ ] **Step 8: Run the hit-test tests and the full suite**

Run:

```powershell
npm test -- src/overlay/hitTest.test.ts
npm test
```

Expected: hit-test tests PASS and the full suite PASS.

- [ ] **Step 9: Commit Task 1**

Run:

```powershell
git add src/shared/overlayBridge.ts src/shared/overlayBridge.test.ts src/overlay/hitTest.ts src/overlay/hitTest.test.ts
git commit -m "feat: add overlay snapshot contract and hit-test math"
```

---

### Task 2: Overlay HTML entry and Vite multi-page build

**Files:**
- Create: `overlay.html`
- Create: `src/overlay-main.tsx`
- Create: `src/Overlay.tsx` (placeholder body for this task)
- Create: `src/overlay.css`
- Modify: `vite.config.ts`

**Interfaces:**
- Produces: a second build entry `overlay.html` mounting `<Overlay />` at `#overlay-root`.
- Consumed by: Task 4 (`main.cjs` loads `overlay.html`).

- [ ] **Step 1: Create the overlay HTML entry**

Create `overlay.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pet Engine Overlay</title>
  </head>
  <body>
    <div id="overlay-root"></div>
    <script type="module" src="/src/overlay-main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create the overlay stylesheet**

Create `src/overlay.css`:

```css
:root {
  color-scheme: light;
}

html,
body,
#overlay-root {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.overlay-stage {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.overlay-pet {
  position: absolute;
  border: 0;
  padding: 0;
  background: transparent;
  pointer-events: auto;
  cursor: grab;
  touch-action: none;
}

.overlay-pet:active {
  cursor: grabbing;
}
```

- [ ] **Step 3: Create a placeholder Overlay component**

Create `src/Overlay.tsx` (Task 5 replaces the body with the real simulation view):

```tsx
export function Overlay() {
  return <div className="overlay-stage" aria-hidden="true" />;
}
```

- [ ] **Step 4: Create the overlay React root**

Create `src/overlay-main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { Overlay } from "./Overlay";
import "./overlay.css";

ReactDOM.createRoot(document.getElementById("overlay-root")!).render(
  <React.StrictMode>
    <Overlay />
  </React.StrictMode>
);
```

- [ ] **Step 5: Register both pages in Vite**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        overlay: resolve(__dirname, "overlay.html")
      }
    }
  }
});
```

- [ ] **Step 6: Verify the multi-page build**

Run:

```powershell
npm run build
```

Expected: PASS, and `dist/index.html` plus `dist/overlay.html` both exist.

- [ ] **Step 7: Confirm both HTML outputs exist**

Run:

```powershell
Test-Path dist/index.html; Test-Path dist/overlay.html
```

Expected: both print `True`.

- [ ] **Step 8: Commit Task 2**

Run:

```powershell
git add overlay.html src/overlay-main.tsx src/Overlay.tsx src/overlay.css vite.config.ts
git commit -m "feat: add overlay entry and multi-page build"
```

---

### Task 3: Reusable companion simulation hook

**Files:**
- Create: `src/overlay/useCompanionSimulation.ts`

**Interfaces:**
- Consumes: `advanceCompanion`, `commandRuntime`, `createInitialRuntime`, `getGroundY`, `getPetSize`, `reconcileRuntime`, `clamp` from `src/behaviorEngine.ts`; `PetProfile`, `PetRuntime`, `EngineSettings` from `src/types.ts`.
- Produces: `useCompanionSimulation({ companions, settings, boundsRef }) => { runtime, runtimeMap, beginDrag, dragPet, endDrag }`.
- Consumed by: Task 5 (`Overlay.tsx`).

This hook lifts the rAF loop and pointer-drag math out of `App.tsx` so the overlay can run the exact same simulation against the full window rather than a boxed stage. `boundsRef` returns the current stage size in CSS pixels.

- [ ] **Step 1: Create the simulation hook**

Create `src/overlay/useCompanionSimulation.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advanceCompanion,
  clamp,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime
} from "../behaviorEngine";
import type { EngineSettings, PetProfile, PetRuntime } from "../types";

export interface SimulationBounds {
  width: number;
  height: number;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface UseCompanionSimulationArgs {
  companions: PetProfile[];
  settings: EngineSettings;
  getBounds: () => SimulationBounds;
}

export function useCompanionSimulation({ companions, settings, getBounds }: UseCompanionSimulationArgs) {
  const [runtime, setRuntime] = useState<PetRuntime[]>(() => createInitialRuntime(companions, getBounds()));
  const dragRef = useRef<DragState | null>(null);
  const lastFrameRef = useRef<number>(performance.now());

  useEffect(() => {
    setRuntime((current) => reconcileRuntime(current, companions, getBounds()));
  }, [companions, getBounds]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const delta = Math.min(32, now - lastFrameRef.current);
      lastFrameRef.current = now;
      const bounds = getBounds();
      setRuntime((current) =>
        current.map((petRuntime) => {
          if (dragRef.current?.id === petRuntime.id) {
            return petRuntime;
          }
          const pet = companions.find((profile) => profile.id === petRuntime.id);
          if (!pet) {
            return petRuntime;
          }
          return advanceCompanion(petRuntime, pet, settings, bounds, delta, now);
        })
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [companions, settings, getBounds]);

  const beginDrag = useCallback((id: string, clientX: number, clientY: number) => {
    setRuntime((current) => {
      const entry = current.find((petRuntime) => petRuntime.id === id);
      if (entry) {
        dragRef.current = { id, offsetX: clientX - entry.x, offsetY: clientY - entry.y };
      }
      return current.map((petRuntime) =>
        petRuntime.id === id
          ? { ...petRuntime, behavior: "drag", vy: 0, stateStartedAt: performance.now() }
          : petRuntime
      );
    });
  }, []);

  const dragPet = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const bounds = getBounds();
      const pet = companions.find((profile) => profile.id === drag.id);
      if (!pet) {
        return;
      }
      const size = getPetSize(pet, settings);
      const nextX = clamp(clientX - drag.offsetX, 8, Math.max(8, bounds.width - size - 8));
      const nextY = clamp(clientY - drag.offsetY, 16, Math.max(16, bounds.height - size * 0.8 - 22));
      setRuntime((current) =>
        current.map((petRuntime) =>
          petRuntime.id === drag.id
            ? { ...petRuntime, x: nextX, y: nextY, behavior: "drag", vy: 0, stateStartedAt: performance.now() }
            : petRuntime
        )
      );
    },
    [companions, settings, getBounds]
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) {
      return;
    }
    const bounds = getBounds();
    const pet = companions.find((profile) => profile.id === drag.id);
    if (!pet) {
      return;
    }
    const ground = getGroundY(pet, settings, bounds.height);
    setRuntime((current) =>
      current.map((petRuntime) =>
        petRuntime.id === drag.id
          ? {
              ...petRuntime,
              behavior: petRuntime.y < ground - 4 && settings.physics ? "fall" : "idle",
              vy: 0,
              y: settings.physics ? petRuntime.y : ground,
              stateStartedAt: performance.now()
            }
          : petRuntime
      )
    );
  }, [companions, settings, getBounds]);

  const runtimeMap = useMemo(() => new Map(runtime.map((entry) => [entry.id, entry])), [runtime]);

  return { runtime, runtimeMap, beginDrag, dragPet, endDrag };
}
```

- [ ] **Step 2: Verify the build compiles the hook**

Run:

```powershell
npm run build
```

Expected: PASS (type-checks against `behaviorEngine` exports).

- [ ] **Step 3: Commit Task 3**

Run:

```powershell
git add src/overlay/useCompanionSimulation.ts
git commit -m "feat: add reusable companion simulation hook"
```

---

### Task 4: Electron two-window shell, tray, and preload bridge

**Files:**
- Modify: `electron/main.cjs`
- Modify: `electron/preload.cjs`
- Modify: `src/vite-env.d.ts`

**Interfaces:**
- Produces window management: overlay (full-screen transparent click-through) + panel windows, tray menu, snapshot relay, `overlay:setInteractive` mouse toggle, `panel:hideToTray`.
- Produces preload surface consumed by `App.tsx` (Task 5) and `Overlay.tsx` (Task 5).

- [ ] **Step 1: Rewrite the Electron main process**

Replace `electron/main.cjs` with:

```js
const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, nativeTheme } = require("electron");
const path = require("path");

let overlayWindow;
let panelWindow;
let tray;
let latestSnapshot = { companions: [], settings: {} };

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function loadPage(win, page) {
  if (isDev) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}/${page}`);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", page));
  }
}

function createOverlayWindow() {
  const primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = primary.workArea;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  loadPage(overlayWindow, "overlay.html");
}

function createPanelWindow() {
  panelWindow = new BrowserWindow({
    width: 420,
    height: 620,
    minWidth: 380,
    minHeight: 520,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    titleBarStyle: "hidden",
    hasShadow: true,
    resizable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.setAlwaysOnTop(true, "floating");
  loadPage(panelWindow, "index.html");

  panelWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      panelWindow.hide();
    }
  });
}

function showPanel() {
  if (!panelWindow) {
    createPanelWindow();
    return;
  }
  panelWindow.show();
  panelWindow.focus();
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip("Pet Engine");
  const menu = Menu.buildFromTemplate([
    { label: "Show panel", click: showPanel },
    {
      label: "Follow mode",
      type: "checkbox",
      checked: false,
      click: (item) => panelWindow?.webContents.send("tray:toggleFollow", item.checked)
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on("double-click", showPanel);
}

app.whenReady().then(() => {
  nativeTheme.themeSource = "light";
  createOverlayWindow();
  createPanelWindow();
  createTray();

  globalShortcut.register("Control+Alt+P", () => {
    showPanel();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createPanelWindow();
    } else {
      showPanel();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// Panel -> main -> overlay: state snapshot.
ipcMain.on("snapshot:push", (_event, snapshot) => {
  latestSnapshot = snapshot;
  overlayWindow?.webContents.send("snapshot:update", snapshot);
});

// Overlay startup -> main -> panel: request a fresh snapshot.
ipcMain.on("snapshot:request", () => {
  overlayWindow?.webContents.send("snapshot:update", latestSnapshot);
  panelWindow?.webContents.send("snapshot:requested");
});

// Overlay hit-test -> main: only capture the mouse while it is over a pet.
ipcMain.on("overlay:setInteractive", (_event, interactive) => {
  overlayWindow?.setIgnoreMouseEvents(!interactive, { forward: true });
});

ipcMain.handle("panel:minimizeToTray", () => {
  panelWindow?.hide();
});

ipcMain.handle("panel:close", () => {
  panelWindow?.hide();
});

ipcMain.handle("panel:alwaysOnTop", (_event, enabled) => {
  panelWindow?.setAlwaysOnTop(Boolean(enabled), enabled ? "floating" : "normal");
  return panelWindow?.isAlwaysOnTop() ?? false;
});
```

- [ ] **Step 2: Rewrite the preload bridge**

Replace `electron/preload.cjs` with:

```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petEngine", {
  // Panel window controls
  minimizeToTray: () => ipcRenderer.invoke("panel:minimizeToTray"),
  close: () => ipcRenderer.invoke("panel:close"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("panel:alwaysOnTop", enabled),

  // Snapshot sync
  pushSnapshot: (snapshot) => ipcRenderer.send("snapshot:push", snapshot),
  requestSnapshot: () => ipcRenderer.send("snapshot:request"),
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("snapshot:update", listener);
    return () => ipcRenderer.removeListener("snapshot:update", listener);
  },
  onSnapshotRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("snapshot:requested", listener);
    return () => ipcRenderer.removeListener("snapshot:requested", listener);
  },

  // Overlay hit-test click-through
  setOverlayInteractive: (interactive) => ipcRenderer.send("overlay:setInteractive", interactive),

  // Tray-driven events
  onTrayToggleFollow: (callback) => {
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on("tray:toggleFollow", listener);
    return () => ipcRenderer.removeListener("tray:toggleFollow", listener);
  }
});
```

- [ ] **Step 3: Update the renderer type declarations**

Replace `src/vite-env.d.ts` with:

```ts
/// <reference types="vite/client" />

import type { OverlaySnapshot } from "./shared/overlayBridge";

declare global {
  interface Window {
    petEngine?: {
      minimizeToTray: () => Promise<void>;
      close: () => Promise<void>;
      setAlwaysOnTop: (enabled: boolean) => Promise<boolean>;
      pushSnapshot: (snapshot: OverlaySnapshot) => void;
      requestSnapshot: () => void;
      onSnapshot: (callback: (snapshot: unknown) => void) => () => void;
      onSnapshotRequested: (callback: () => void) => () => void;
      setOverlayInteractive: (interactive: boolean) => void;
      onTrayToggleFollow: (callback: (enabled: boolean) => void) => () => void;
    };
  }
}

export {};
```

- [ ] **Step 4: Verify the build**

Run:

```powershell
npm run build
```

Expected: PASS. (This checks the renderer types; `App.tsx` still references the old preload names and WILL fail to type-check here — if so, that is expected and fixed in Task 5. To keep Task 4 green on its own, temporarily leave the old `window.petEngine` calls in `App.tsx` untouched only if they still compile; otherwise proceed directly into Task 5 before running the build. Prefer running Task 4 + Task 5 back to back.)

> Note for the executor: Task 4 changes the preload contract that `App.tsx` depends on. Run `npm run build` only after Task 5 updates `App.tsx`. Do the commit below first (source is self-consistent for the electron layer), then move to Task 5 immediately.

- [ ] **Step 5: Commit Task 4**

Run:

```powershell
git add electron/main.cjs electron/preload.cjs src/vite-env.d.ts
git commit -m "feat: add overlay and panel windows with tray and snapshot relay"
```

---

### Task 5: Panel broadcasts snapshot; overlay consumes and roams

**Files:**
- Modify: `src/App.tsx`
- Create: `src/Overlay.tsx` (replace placeholder from Task 2)

**Interfaces:**
- Consumes: `normalizeSnapshot`, `OverlaySnapshot` from `src/shared/overlayBridge.ts`; `useCompanionSimulation` from `src/overlay/useCompanionSimulation.ts`; `findPetAtPoint`, `PetBox` from `src/overlay/hitTest.ts`; `getSummonedCompanions` from `src/companionState.ts`; `getPetSize` from `src/behaviorEngine.ts`.
- Produces: panel pushes snapshots and hides to tray; overlay renders roaming pets and toggles click-through.

- [ ] **Step 1: Panel pushes snapshot and answers snapshot requests**

In `src/App.tsx`, add the snapshot import near the other imports:

```ts
import type { OverlaySnapshot } from "./shared/overlayBridge";
```

Inside `App`, after `summonedCompanions` and `settings` exist, add:

```ts
const pushSnapshot = useCallback(() => {
  const snapshot: OverlaySnapshot = { companions: summonedCompanions, settings };
  window.petEngine?.pushSnapshot(snapshot);
}, [summonedCompanions, settings]);

useEffect(() => {
  pushSnapshot();
}, [pushSnapshot]);

useEffect(() => {
  if (!window.petEngine?.onSnapshotRequested) {
    return;
  }
  return window.petEngine.onSnapshotRequested(() => pushSnapshot());
}, [pushSnapshot]);
```

- [ ] **Step 2: Swap the panel window controls to tray docking**

In `src/App.tsx`, update the `TopBar` usage and buttons so `minimize` and `close` hide to the tray. Replace the `IconButton` minimize/close handlers inside `TopBar` with:

```tsx
<IconButton label="Minimize to tray" onClick={() => window.petEngine?.minimizeToTray()}>
  <Minus size={17} />
</IconButton>
<IconButton label="Close to tray" tone="danger" onClick={() => window.petEngine?.close()}>
  <X size={17} />
</IconButton>
```

Replace the `alwaysOnTop` effect body (previously `window.petEngine.setAlwaysOnTop`) — it keeps the same call name, which still exists in the new preload, so no change is required there. Remove the now-dead `desktopMode` and `clickThrough` effects and the `onClickThroughChanged` effect from `App.tsx`, because click-through is now owned by the overlay window, not the panel:

Delete these effects from `App.tsx`:

```ts
// DELETE: setDesktopMode effect
useEffect(() => {
  if (!window.petEngine) { return; }
  window.petEngine.setDesktopMode(settings.desktopMode).catch(() => undefined);
}, [settings.desktopMode]);

// DELETE: clickThrough reset effect
useEffect(() => {
  updateSettings({ clickThrough: false });
}, [updateSettings]);

// DELETE: setClickThrough effect
useEffect(() => {
  if (!window.petEngine) { return; }
  window.petEngine.setClickThrough(settings.clickThrough).catch(() => undefined);
}, [settings.clickThrough]);

// DELETE: onClickThroughChanged effect
useEffect(() => {
  if (!window.petEngine?.onClickThroughChanged) { return; }
  return window.petEngine.onClickThroughChanged((enabled) => {
    updateSettings({ clickThrough: enabled });
  });
}, [updateSettings]);
```

- [ ] **Step 2b: Remove the in-panel pet stage and its simulation**

The panel no longer renders pets — they live on the overlay. In `src/App.tsx`:

1. Remove the `<PetStage ... />` element from the render and its import.
2. Remove the panel-local simulation: the `runtime` state, the rAF `tick` effect, the `pointermove`/`pointerup` drag effect, `dragRef`, `lastFrameRef`, `stageRef`, `petRuntimeMap`, `onPetPointerDown`, `callSelectedPet`, and `resetPets`.
3. `commandPet` currently mutates local `runtime`; since the panel no longer owns runtime, change command handling to a no-op stub for this phase (behavior commands are re-wired to the overlay in a later phase). Replace `commandPet`, `onCommand`, `onCall`, and `onReset` wiring in `CommandBar` with disabled placeholders:

```tsx
<CommandBar
  selectedPet={selectedPet}
  settings={settings}
  onSettingsChange={updateSettings}
  onCommand={() => undefined}
  onCall={() => undefined}
  onReset={() => undefined}
/>
```

4. Keep: companion state, settings, notes/tasks/timer/stats, `CompanionTray`, `ToolDrawer`, `TopBar`, snapshot push.
5. Remove now-unused imports (`PetStage`, `createInitialRuntime`, `reconcileRuntime`, `advanceCompanion`, `commandRuntime`, `getGroundY`, `getPetSize`, `clamp`, `PetRuntime`, `PointerEvent`). Keep imports still used elsewhere.

> Executor note: after this edit, `App.tsx` should have no references to `runtime`, `stageRef`, or `PetStage`. Let the TypeScript build in Step 4 catch stragglers.

- [ ] **Step 3: Implement the overlay simulation view**

Replace `src/Overlay.tsx` with:

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { PetAvatar } from "./PetAvatar";
import { getPetSize } from "./behaviorEngine";
import { normalizeSnapshot, type OverlaySnapshot } from "./shared/overlayBridge";
import { findPetAtPoint, type PetBox } from "./overlay/hitTest";
import { useCompanionSimulation, type SimulationBounds } from "./overlay/useCompanionSimulation";
import { initialSettings } from "./data";

const emptySnapshot: OverlaySnapshot = { companions: [], settings: { ...initialSettings } };

export function Overlay() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(emptySnapshot);
  const interactiveRef = useRef(false);
  const draggingRef = useRef(false);

  const getBounds = useCallback((): SimulationBounds => ({ width: window.innerWidth, height: window.innerHeight }), []);

  const { runtime, runtimeMap, beginDrag, dragPet, endDrag } = useCompanionSimulation({
    companions: snapshot.companions,
    settings: snapshot.settings,
    getBounds
  });

  // Subscribe to snapshots and request the initial one.
  useEffect(() => {
    if (!window.petEngine) {
      return;
    }
    const unsubscribe = window.petEngine.onSnapshot((value) => setSnapshot(normalizeSnapshot(value)));
    window.petEngine.requestSnapshot();
    return unsubscribe;
  }, []);

  // Build current hit boxes from the live runtime.
  const boxes = useMemo<PetBox[]>(() => {
    return runtime
      .map((entry) => {
        const pet = snapshot.companions.find((profile) => profile.id === entry.id);
        if (!pet) {
          return null;
        }
        const size = getPetSize(pet, snapshot.settings);
        return { id: entry.id, x: entry.x, y: entry.y, width: size, height: size };
      })
      .filter((box): box is PetBox => box !== null);
  }, [runtime, snapshot]);

  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;

  // Toggle window click-through based on whether the cursor is over a pet.
  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      if (draggingRef.current) {
        dragPet(event.clientX, event.clientY);
        return;
      }
      const over = findPetAtPoint({ x: event.clientX, y: event.clientY }, boxesRef.current) !== null;
      if (over !== interactiveRef.current) {
        interactiveRef.current = over;
        window.petEngine?.setOverlayInteractive(over);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [dragPet]);

  const onPetPointerDown = useCallback(
    (id: string, event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      beginDrag(id, event.clientX, event.clientY);
    },
    [beginDrag]
  );

  const onPetPointerUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      endDrag();
    }
  }, [endDrag]);

  return (
    <div className="overlay-stage">
      {snapshot.companions.map((pet) => {
        const current = runtimeMap.get(pet.id);
        if (!current) {
          return null;
        }
        const size = getPetSize(pet, snapshot.settings);
        return (
          <button
            key={pet.id}
            type="button"
            className={`overlay-pet behavior-${current.behavior}`}
            style={{
              transform: `translate3d(${current.x}px, ${current.y}px, 0) scaleX(${current.direction})`,
              width: size,
              height: size
            }}
            onPointerDown={(event) => onPetPointerDown(pet.id, event)}
            onPointerUp={onPetPointerUp}
            onPointerCancel={onPetPointerUp}
          >
            <PetAvatar pet={pet} behavior={current.behavior} />
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Build and type-check**

Run:

```powershell
npm run build
```

Expected: PASS with no unused-import or missing-symbol errors in `App.tsx` or `Overlay.tsx`.

- [ ] **Step 5: Run the full test suite**

Run:

```powershell
npm test
```

Expected: PASS (existing suites plus Task 1 tests).

- [ ] **Step 6: Commit Task 5**

Run:

```powershell
git add src/App.tsx src/Overlay.tsx
git commit -m "feat: roam pets on overlay and dock panel state to snapshot"
```

---

### Task 6: Panel tray docking, position memory, and manual QA

**Files:**
- Modify: `electron/main.cjs`

**Interfaces:**
- Produces: panel window remembers its last position and size across launches (in-process; persisted to a small JSON file in `app.getPath("userData")`).

- [ ] **Step 1: Persist and restore panel bounds**

In `electron/main.cjs`, add near the top after the `require`s:

```js
const fs = require("fs");

function boundsFilePath() {
  return path.join(app.getPath("userData"), "panel-bounds.json");
}

function readSavedBounds() {
  try {
    return JSON.parse(fs.readFileSync(boundsFilePath(), "utf-8"));
  } catch {
    return null;
  }
}

function saveBounds(bounds) {
  try {
    fs.writeFileSync(boundsFilePath(), JSON.stringify(bounds));
  } catch {
    // Position memory is a convenience; ignore write failures.
  }
}
```

In `createPanelWindow`, apply saved bounds by replacing the `width`/`height` literals with saved values when present:

```js
function createPanelWindow() {
  const saved = readSavedBounds();
  panelWindow = new BrowserWindow({
    width: saved?.width ?? 420,
    height: saved?.height ?? 620,
    x: saved?.x,
    y: saved?.y,
    minWidth: 380,
    minHeight: 520,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    titleBarStyle: "hidden",
    hasShadow: true,
    resizable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.setAlwaysOnTop(true, "floating");
  loadPage(panelWindow, "index.html");

  const persist = () => saveBounds(panelWindow.getBounds());
  panelWindow.on("moved", persist);
  panelWindow.on("resized", persist);

  panelWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      persist();
      panelWindow.hide();
    }
  });
}
```

- [ ] **Step 2: Build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 3: Manual smoke test (Electron)**

Run:

```powershell
npm run dev
```

Verify each item, then close:

1. Panel window appears; a transparent overlay covers the desktop with Martyn and Charles walking along the bottom.
2. Moving the cursor over empty desktop does NOT block clicks to desktop icons (click-through active).
3. Moving the cursor over a pet lets you press and drag it; releasing drops it (falls if physics on).
4. Summoning a catalog pet in the panel makes it appear on the overlay within a moment (snapshot sync).
5. Minimize and close buttons hide the panel to the tray; the overlay pets keep roaming.
6. Tray icon: "Show panel" reopens it; `Ctrl+Alt+P` also reopens and focuses it.
7. Move/resize the panel, quit from tray, relaunch: panel reappears at the same place/size.

- [ ] **Step 4: Commit Task 6**

Run:

```powershell
git add electron/main.cjs
git commit -m "feat: persist panel window position and size"
```

---

## Self-Review Notes

- **Spec coverage (Phase 1 slice):** overlay/panel split (Tasks 2, 4, 5), tray + menu (Task 4), snapshot sync (Tasks 1, 4, 5), hit-test click-through (Tasks 1, 5), pets roam real desktop (Tasks 3, 5), grab & drag (Tasks 3, 5), minimize/close to tray (Tasks 4, 5), position memory (Task 6), `Ctrl+Alt+P` recovery preserved (Task 4). Deferred phases listed under "Scope of this plan".
- **Type consistency:** preload method names (`minimizeToTray`, `close`, `setAlwaysOnTop`, `pushSnapshot`, `requestSnapshot`, `onSnapshot`, `onSnapshotRequested`, `setOverlayInteractive`, `onTrayToggleFollow`) match across `preload.cjs`, `vite-env.d.ts`, `App.tsx`, and `Overlay.tsx`. `OverlaySnapshot` shape (`{ companions, settings }`) is identical in `overlayBridge.ts` and all consumers. `useCompanionSimulation` returns exactly the members `Overlay.tsx` destructures.
- **Ordering caveat:** Task 4 changes the preload contract `App.tsx` relies on; Tasks 4 and 5 must be executed back-to-back before running `npm run build` (called out inline in Task 4 Step 4 and Task 5 Step 4).
```

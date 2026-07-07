# Pet Engine v2: Free-Roam Desktop Companions — Design Spec

**Date:** 2026-07-07
**Status:** Awaiting approval
**Supersedes:** stage-bound companion design in `docs/superpowers/plans/2026-07-06-martyn-charles-desktop-pet.md` (Tasks 1–6 complete; Task 7 folded into this spec)

## Goal

Turn Pet Engine from a single-window app with a boxed pet stage into a polished desktop-pet product: Martyn and Charles roam the whole desktop on a transparent overlay, a compact control panel docks to the system tray, pets follow the mouse, and the two custom cats get articulated reference-matching animations. Ships as a Windows installer.

## Non-Goals

- No runtime image generation, external AI services, cloud sync, accounts, or multiplayer.
- No walking on other applications' window edges (Shimeji-style native window tracking). Screen edges only.
- Multi-monitor support is deferred; primary display only for v2.
- Catalog pets do not get articulated rigs, stalk/pounce, or special props.

## Architecture

Two renderer windows plus the Electron main process.

### Overlay window (pet layer)

- Full-screen on the primary display work area, transparent, frameless, `skipTaskbar`, always-on-top at `screen-saver` level.
- Click-through by default via `setIgnoreMouseEvents(true, { forward: true })`.
- Runs the simulation: `requestAnimationFrame` loop driving `behaviorEngine` with screen-work-area bounds. Pets walk along the bottom of the work area (above the taskbar).
- Hit-testing: overlay renderer tracks pet bounding boxes; when the cursor is over a pet, it asks main to disable click-through so the pet can be clicked/grabbed; re-enables when cursor leaves all pets and no drag is active.

### Panel window (control layer)

- Compact (~400×600) frameless window, sticker-aesthetic UI.
- Owns all persistent state (localStorage via existing `useLocalStorageState`): companion state, settings, notes/tasks/timer/stats.
- Minimize and close both hide to tray. Quit only from tray menu or panel quit action.

### Main process

- Creates both windows; overlay first, then panel.
- System tray: app icon; menu = Show panel, Follow mode (checkbox), Quit. Double-click tray icon shows panel.
- IPC relay: forwards state snapshots and commands panel → overlay, interaction events overlay → panel. No business logic in main beyond window/tray management.
- Cursor pump: polls `screen.getCursorScreenPoint()` at ~30 Hz and pushes to overlay. Active only while follow mode is on; idle otherwise. Hover hit-testing does not need the pump — with `setIgnoreMouseEvents(true, { forward: true })` the overlay renderer still receives `mousemove` events.
- Keeps `Ctrl+Alt+P` global recovery: disables click-through, shows and focuses panel.
- Remembers panel window position across launches. Optional launch-at-login setting (`app.setLoginItemSettings`).

### State + data flow

- Panel is the single source of truth for profiles and settings. On any change, panel sends a full snapshot (companions + settings) through main to overlay. Overlay never persists.
- Overlay owns transient runtime state (positions, velocities, behaviors) and never sends it to the panel except summary interaction events (pet clicked, grab started/ended) for stats/UI feedback.
- On overlay (re)load it requests the current snapshot, so refreshes and crashes recover cleanly.
- Storage schema: `CompanionState` v3 adds per-companion and global fields below; `normalizeCompanionState` migrates v2 → v3 with defaults.

## Behavior Engine Extensions

`src/behaviorEngine.ts` stays a pure module (testable without DOM). Additions:

### New behaviors

`chase`, `stalk`, `pounce`, `zoomies`, `climb`, `perch`, `drink`, `greet`, `nap-together`, `react` — added to the existing set (`idle`, `walk`, `sit`, `sleep`, `stretch`, `watch`, `jump`, `fall`, `drag`).

### Movement + physics

- Runtime gains `vx` alongside `vy`, plus `rotation` for tumble.
- Grab & toss: dragging tracks cursor velocity; on release the pet inherits it, tumbles (rotation proportional to speed), arcs under gravity, and lands on its feet (brief crouch-recover pose). Walls bounce with damping.
- Zoomies: rare random trigger from idle/walk (weight scaled by `energy`); fast run across the screen with a skid stop.
- Edge climb (cats only): from walk near a screen side edge, chance to climb up the edge, then `perch` on the top edge for a while, then jump down (`fall` with landing).

### Follow mode

- Global toggle (panel + tray). All summoned pets set target = cursor; walk (or run if far) toward it; within an arrival radius they `sit`/`watch` the cursor.
- Cats only, when pounce option enabled: if cursor stays still > ~2 s while a cat is mid-range, cat enters `stalk` (low crouch, slow approach, tail twitch), then `pounce` (leap onto cursor position, brief triumphant sit).
- Follow and pounce are separate toggles; pounce only meaningful while follow is on.

### Pet-to-pet interactions

- Ambient: when Martyn and Charles are both summoned and idle near each other, occasional `greet` (nose boop) or `nap-together` (curl up adjacent, synchronized sleep).
- Chase: rare trigger — one cat zoomies at the other, the other flees briefly. Cooldown so it stays rare.

### Click reactions

- Single click: `react` — purr hearts particle + happy pose, per-pet flavor (Martyn: slow blink; Charles: chirp pose).
- Double click: per-pet special — Martyn: alert loaf with tail thump; Charles: roll onto back.

### Charles fountain

- Small water-fountain prop rendered on the overlay near the bottom edge; user can drag it to reposition (position persisted in settings).
- Charles periodically walks to it and plays `drink` (head down to fountain, lapping loop, based on `references/charles` fountain photos). Martyn ignores it.
- Prop can be hidden via panel toggle.

## Martyn + Charles Articulated Rigs

- Rewrite `MartynAvatar`/`CharlesAvatar` as articulated rigs: SVG groups for head (ears, eyes, whiskers, blush), torso, front legs, back legs, tail. Side-profile bodies suited to walking.
- CSS keyframe animation per part: real leg-swing walk cycle, run cycle for zoomies/chase, tail sway, ear flicks, periodic blinks.
- Distinct pose per behavior, including: sit, loaf, sleep curl, stretch (Charles signature: front legs straight up, happy closed eyes), watch (Martyn signature: upright, tracking), stalk crouch, pounce leap, climb (vertical cling), perch, drink (Charles), drag dangle, tumble.
- Visual identity per saved sticker spec (`memory/pet-visual-style.md`): OG kawaii sticker style, thick warm-brown outlines (#704c35, stroke 5), big round highlight eyes, blush, pink ears/nose/beans. Martyn: chunky bright white, dark gray crown patch between ears only (face all white), gray tabby striped tail with white tip, black toe spots on one front paw, yellow-green eyes. Charles: slimmer orange-and-white, orange tabby cap over ears/eyes with forehead stripes, white muzzle/chest/belly/legs, orange mantle, striped orange tail, hazel eyes.
- Full bodies always; verified against `references/martyn/` and `references/charles/` photos before sign-off.
- Catalog pets keep current avatars; they get follow, toss, and zoomies via generic whole-body animation, nothing articulated.

## Panel UI Redesign

- Sticker-aesthetic compact panel: header with app name + window controls (minimize-to-tray, close-to-tray).
- Martyn & Charles cards (portrait, mood/behavior readout, per-cat command buttons).
- Catalog grid: summon/hide as today.
- Toggles: follow mode, pounce, physics, click-through, show names, fountain, launch at login. Sliders: global scale, speed.
- Tools (notes, tasks, timer, stats) stay in the existing drawer, restyled to match.
- First-run: panel opens centered with a short hint ("pets live on your desktop now — Ctrl+Alt+P brings this panel back").

## Packaging

- electron-builder, NSIS target, one-click installer.
- Real app icon (sticker-style cat mark) used for window, tray, and installer.
- `npm run dist` produces the installer; `npm run build` stays the dev-verification build.

## Testing

- Vitest (existing harness):
  - behaviorEngine: toss physics (velocity inheritance, landing), chase targeting, stalk/pounce state machine, zoomies trigger, climb/perch transitions, pet-to-pet proximity triggers, drink scheduling.
  - Hit-test math (pure function: cursor point vs pet boxes).
  - Snapshot normalization: v2 → v3 migration, new settings defaults.
  - Rig render tests: pose markers per behavior for both cats (server-rendered markup).
- Manual visual QA against reference photos for both rigs; overlay interaction smoke test (grab, toss, click-through toggling) before sign-off.

## Implementation Phases

1. **Windows + tray + free roam**: overlay/panel split, IPC snapshot sync, tray, hit-test click-through, pets walk the real desktop, grab & drag (no toss yet).
2. **Articulated rigs**: Martyn/Charles rebuilt with part rigs, walk cycle, core poses.
3. **Follow + pounce**: cursor pump, follow toggle, stalk/pounce for cats.
4. **Fun extras**: toss physics, zoomies, edge climb/perch, pet-to-pet interactions, click reactions, Charles fountain.
5. **Polish + ship**: panel redesign, first-run hint, position memory, launch-at-login, app icon, installer.

Each phase lands as its own set of plan tasks, executed via subagent-driven development, all tests + `npm run build` green per task.

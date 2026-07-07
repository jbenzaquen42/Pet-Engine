# Companion Controls and Tools Repair Design

## Goal

Fix the current desktop companion control issues without redesigning the whole app: built-in cats can be hidden and edited safely, pounce and follow mode are visibly useful, tool controls work reliably, and small icons/pets are easier to click.

## Context

Pet Engine is an Electron/Vite/React desktop companion app with a frameless control panel, a transparent full-screen overlay, a tray menu, and localStorage-backed companion/settings state. The current implementation has several root causes behind the reported behavior:

- Martyn and Charles are marked `locked` and rendered in a separate tray section with no summon/hide controls.
- Scale and pace live as global settings, so changing them affects all pets instead of selected pets.
- Follow mode only steers pets along the X axis and pins Y to the ground, which prevents free-roam cursor following.
- Multiple pets can target the same follow location, which lets them overlap.
- Pounce is only reached after follow arrival and cursor idle conditions, so it is easy for it to appear inactive.
- Tool drawer controls are compact and can be clipped or hard to activate, especially the timer.
- Overlay hit testing uses exact pet bounds, and toolbar buttons have small interaction areas.

## Requirements

1. Martyn and Charles remain built-in authored companions, but they can be hidden and shown like catalog pets.
2. Built-in companions are not destructively deleted. Hiding them only sets `summoned: false`; they remain available to restore.
3. The app supports selecting one or multiple companions for editing.
4. Pet edits apply only to selected companions, not all cats or all pets.
5. Single-pet editing shows exact values for that pet.
6. Multi-pet editing applies changed values to all selected pets and clearly handles mixed values.
7. Pounce visibly triggers for cats in follow mode when the cursor pauses near their assigned follow slot.
8. Follow mode lets animals roam across the screen, not only along the bottom.
9. Animals in follow mode avoid stacking on top of each other.
10. Notes, To Do, and Timer can pop out from the drawer into separate floating tool surfaces.
11. Timer controls must be reliably actionable in both drawer and pop-out surfaces: start, pause, reset, and duration changes.
12. Toolbar icons and pet interactions get forgiving click targets without visually bloating the UI.

## Architecture

Keep the existing React/Electron structure and add targeted modules where behavior needs clear boundaries:

- `companionState.ts` remains the source of normalized companion catalog state and gains update helpers for selected companions.
- `CompanionTray.tsx` becomes a companion selection and summon/hide surface for both built-in and catalog pets.
- `CommandBar.tsx` keeps global behavior toggles, but per-pet settings move to a companion editor area.
- `ToolDrawer.tsx` shares state with new pop-out tool surfaces.
- `behaviorEngine.ts` owns full-screen follow, pounce, and follow-mode separation logic.
- `overlay/hitTest.ts` owns padded overlay hit targets.
- `electron/main.cjs` owns creation/show/hide of optional tool windows if native Electron pop-outs are used.

## Companion Controls

Martyn and Charles are treated as built-in authored pets rather than locked pets. Their avatar identity and default definitions remain protected by code defaults, but the user can summon/hide them and edit runtime-facing fields such as size, speed, energy, colors, and personality weights. If a stored profile is invalid or missing fields, normalization restores the authored defaults while preserving user-controlled fields where safe.

The tray shows all companions with a clear summoned state. Selecting a pet does not implicitly summon it; summon/hide is its own control. Multi-select supports editing several companions together. The first version uses checkbox-style selection plus a current focused pet for commands.

## Per-Pet Editing

Global `globalScale` and `globalSpeed` remain as global multipliers, but the user-facing pet editor changes `PetProfile.size`, `PetProfile.speed`, and `PetProfile.energy` on selected pets. This keeps per-pet tuning independent while preserving existing engine math.

For multi-select:

- If selected pets share a value, show that value.
- If selected pets differ, show a mixed state label or empty neutral value.
- When the user changes a control, apply the new value to every selected pet.

## Follow, Pounce, and Separation

Follow mode assigns each follower a target slot around the cursor instead of sending every animal to the same point. Slots are deterministic by companion order so movement does not jitter. Example slots: center-left, center-right, above-left, above-right, below-left, below-right, expanding outward for more pets.

The follow target includes both X and Y. Pets move toward their assigned slot with clamped bounds that keep the full sprite on screen. Normal ambient ground behaviors can still exist when follow is off.

When two follow-mode pets get too close, a separation pass pushes them apart based on their pet sizes. This runs after each frame update and before rendering. The pass is small and predictable, not a physics simulation rewrite.

Pounce triggers when:

- Follow mode is active.
- Pounce is enabled.
- The pet is a cat.
- The pet is near its assigned slot.
- The cursor has been idle for a short threshold.

The pounce animation uses both X and Y so it is visible even away from the ground.

## Tools and Timer

Notes, To Do, and Timer remain tabs in the drawer. Each tab gets a pop-out button. Pop-outs are in-panel floating surfaces for the first pass, with their own larger controls and shared React state so edits stay synchronized.

Timer is a priority fix. It needs:

- Large enough start/pause and reset buttons to click comfortably.
- A duration control, such as minute stepper buttons plus a numeric minutes input.
- Disabled or bounded states that still communicate what action is possible.
- Working behavior in both the drawer and timer pop-out.

Native Electron child windows are deferred until after the in-panel floating surfaces are working reliably. This keeps timer actions, notes edits, and task edits on one state path.

## Hit Targets

Toolbar icon buttons keep their visual size but increase clickable padding or minimum hit box. Overlay pet hit testing uses a small padded box around each sprite, enough to make interaction forgiving without causing accidental grabs when the cursor is far away.

## Testing

Add or update focused tests before implementation:

- Companion state normalization preserves built-ins and allows summoned changes.
- Companion tray renders summon/hide controls for Martyn and Charles.
- Per-pet update helpers change only selected companion ids.
- Multi-select mixed values are represented consistently.
- Timer controls render and invoke start/pause/reset/duration callbacks.
- Pop-out tool trigger controls render for notes, tasks, and timer.
- Follow target assignment produces separate slots for multiple pets.
- Follow movement changes both X and Y.
- Cat pounce transitions from follow-watch/stalk into pounce when cursor is idle.
- Separation pass resolves overlapping follow-mode pets.
- Hit testing returns pets within padded bounds.

## Out of Scope

- Deleting built-in companion definitions from the catalog.
- A full companion creation wizard.
- A complete visual redesign of the panel.
- Complex flocking or physics simulation.
- Cloud sync or cross-device persistence.

# Martyn and Charles Desktop Pet Redesign

Date: 2026-07-06
Status: Approved design direction, pending written-spec review

## Purpose

Turn the current Pet Engine prototype into a stronger desktop companion app centered on two fixed custom cats, Martyn and Charles, while preserving the original Desktop Pet Engine style for the rest of the summonable pet catalog.

The result should feel less like a generic pet editor and more like a compact desktop utility with two authored cats that carry the personality of the reference photos and videos.

## Current State

The app is a Vite, React, TypeScript, and Electron desktop app. It currently has:

- A transparent, frameless Electron window with always-on-top and desktop mode support.
- A React stage with draggable SVG pets and simple runtime behavior.
- Editable pet profiles for name, species, style, colors, size, and energy.
- A side tool drawer with notes, tasks, timer, and stats.
- Local storage persistence for pets, settings, notes, tasks, and stats.

Important current files:

- `src/App.tsx`: main UI, runtime behavior loop, pet editor, tools, and commands.
- `src/PetAvatar.tsx`: SVG avatar rendering for all pet patterns.
- `src/data.ts`: initial pet and settings data.
- `src/types.ts`: pet, behavior, runtime, and settings types.
- `electron/main.cjs` and `electron/preload.cjs`: desktop window controls.

## Reference Analysis

The `references` folder contains three useful groups:

- `references/charles`: 27 images and 4 videos.
- `references/martyn`: 23 images and 6 videos.
- `references/og`: original Steam store page images, screenshots, and one screen capture.

Charles reference traits:

- Orange-and-white coat with visible patches across the back and head.
- Long, relaxed body language with many couch, window, and curled sleep poses.
- Frequent lounging, stretching, loafing, side-lying, and cozy sleep moments.
- Personality should read as soft, loungey, sunny, and occasionally alert.

Martyn reference traits:

- Mostly white coat with dark head markings and dark tail markings.
- Rounder body language, more upright sitting, loafing, and grounded poses.
- Frequent window, door, cat-tree, food, and water moments.
- Personality should read as watchful, sturdy, mildly dramatic, and comfort-seeking.

Original app reference traits:

- Compact floating utility UI rather than a full dashboard.
- Desktop pets are the primary experience; UI exists to summon, control, and manage them.
- A catalog-like collection of pets with simple behaviors.
- Productivity tools are small and optional: notepad, Pomodoro, task list, and related helpers.
- Pets should feel ambient and lightweight on top of the user's desktop.

## Goals

- Make Martyn and Charles the primary custom companions.
- Keep Martyn and Charles uneditable.
- Preserve a summonable original-style catalog for non-custom pets.
- Improve the app's desktop feeling through compact controls, cleaner desktop mode, and click-through support.
- Separate behavior logic from UI so custom cat personality can evolve without making `App.tsx` harder to work in.
- Keep the implementation local-first with no server requirement.

## Non-Goals

- Do not build a full animation editor.
- Do not require image-generation or external AI services at runtime.
- Do not train a model from the reference photos or videos.
- Do not add cloud sync, accounts, or multiplayer behavior.
- Do not make Martyn and Charles editable by the user.
- Do not remove the existing productivity tools unless they interfere with the compact desktop experience.

## Product Model

The app should have two classes of companions:

1. Custom locked cats
   - Martyn and Charles.
   - Authored avatars, authored personality weights, fixed names, fixed appearance.
   - They can be summoned, hidden, dragged, called, and commanded, but not edited.

2. Original-style catalog pets
   - Existing generic pet types such as object, cat variants, capybara, elephant, monster, raccoon, and dog.
   - These use simple ambient behavior and can be summoned or hidden.
   - They are not presented as deep profile-editable characters.

## Architecture

Split the current monolithic app into clearer units:

- `src/data.ts`
  - Owns default companion definitions, original catalog definitions, and default app settings.

- `src/types.ts`
  - Adds locked/custom/catalog flags and richer behavior states.
  - Keeps runtime state separate from companion definition.

- `src/behaviorEngine.ts`
  - Owns movement, state transitions, gravity, idle decisions, and personality weighting.
  - Exposes small functions such as `createInitialRuntime`, `reconcileRuntime`, `advanceCompanion`, and `commandCompanion`.

- `src/PetAvatar.tsx`
  - Routes each companion to an avatar renderer.
  - Adds specific `MartynAvatar` and `CharlesAvatar` renderers.
  - Keeps generic catalog SVGs for original-style pets.

- `src/App.tsx`
  - Owns layout, state wiring, commands, tool drawer, and Electron controls.
  - Stops owning the detailed behavior math directly.

- `src/components/`
  - Extract `CompanionTray`, `PetStage`, `CommandBar`, and `ToolDrawer` when replacing the editor rail.
  - Keep these components prop-driven so `App.tsx` remains the state coordinator instead of the owner of every layout detail.

This keeps the first implementation practical while making the most complex area, behavior, independently understandable.

## Data Model

Extend `PetProfile` into a more specific companion profile shape:

- `id`
- `name`
- `species`
- `kind`: `custom` or `catalog`
- `locked`: boolean
- `avatar`: pattern or authored avatar id
- `breedLabel`
- `primaryColor`, `secondaryColor`, `accentColor`, `eyeColor`
- `size`, `speed`, `energy`
- `personality`

Add a personality object for movement and state weighting:

- `idleWeight`
- `walkWeight`
- `sitWeight`
- `sleepWeight`
- `stretchWeight`
- `watchWeight`
- `jumpWeight`
- `wanderBias`

Add runtime fields as needed:

- `behavior`
- `x`, `y`
- `direction`
- `vy`
- `phase`
- `stateStartedAt`
- `targetX`
- `lastInteractionAt`

The initial data should define exactly two default custom cats: `martyn` and `charles`.

## Behavior Design

The behavior engine should support these states:

- `idle`: still breathing, occasional glance or tail motion.
- `walk`: ambient horizontal movement.
- `sit`: seated pose with low movement.
- `sleep`: breathing pose, longer dwell time.
- `stretch`: short authored transition, especially important for Charles.
- `watch`: upright attentive pose, especially important for Martyn.
- `jump`: user-commanded playful movement.
- `fall`: gravity return after drag.
- `drag`: pointer-controlled movement.

Personality weighting:

- Charles should favor `sleep`, `stretch`, `sit`, and slower `walk`.
- Martyn should favor `watch`, `sit`, `idle`, and shorter purposeful `walk`.
- Catalog pets should use simpler balanced weights close to the current behavior.

The engine should continue to honor global speed, global scale, physics, and reduced motion.

## Avatar Design

Martyn and Charles should be hand-authored SVG avatars, not editable recolors of the current generic cat.

Charles avatar requirements:

- Orange-and-white patch layout.
- Longer body silhouette.
- Curled-sleep and stretched poses should read clearly.
- Tail should feel soft and expressive.
- Sitting/loafing should preserve the orange head/back identity.

Martyn avatar requirements:

- Mostly white body.
- Dark cap/head markings and dark tail markings.
- Rounder, heavier seated and loaf shapes.
- Upright watch pose should be visually distinct.
- Facial expression can be calm, unimpressed, or expectant.

Generic catalog avatar requirements:

- Keep existing simple SVG style for generic pets.
- Improve consistency where useful, but do not spend the first implementation trying to redesign every catalog pet.

## UI Design

Replace the current editor-first rail with a compact companion tray:

- Fixed entries for Martyn and Charles.
- A catalog section for original-style pets.
- Summon/hide controls for each companion.
- Selected companion status.
- No name/species/color editing for Martyn or Charles.

Keep a command bar with icon buttons:

- Walk
- Sit
- Nap
- Jump
- Call
- Reset positions
- Physics toggle
- Name tags toggle
- Desktop mode
- Click-through mode

Keep the tool drawer, but make it secondary:

- Notes
- Tasks
- Timer
- Stats

The default first impression should be the pets on a desktop stage, not a form. Desktop mode should reduce UI chrome more aggressively and make pets feel like they live on the desktop.

## Storage and Migration

Local storage currently persists fully editable pet data. The redesign should handle older saved data safely:

- Introduce a storage schema version.
- If old data lacks the new schema, replace default companion definitions with the new fixed Martyn and Charles plus catalog defaults.
- Preserve notes, tasks, stats, and general settings when possible.
- Do not preserve old edited names/colors for Martyn and Charles.

If storage parsing fails, fall back to defaults and keep the app running.

## Electron Desktop Behavior

Use existing Electron APIs and expose any missing UI wiring:

- Always on top remains available.
- Desktop mode remains available.
- Click-through should be surfaced in the UI using the existing preload/main IPC path.
- Desktop mode should make chrome very low-opacity or hidden until hover.
- Click-through mode must have a guaranteed recovery path: register a global Electron shortcut, `Ctrl+Alt+P`, that disables click-through and restores a focusable window.
- Click-through should reset to disabled on app launch.

The implementation should avoid trapping the user in an unclickable window state.

## Error Handling

- Missing or invalid saved storage should not crash the app.
- Unknown companion ids in runtime state should be dropped during reconciliation.
- Unknown avatar ids should fall back to a generic catalog avatar.
- Stage bounds should keep companions visible after resize.
- Electron IPC failures should fail silently or show inactive state rather than breaking the UI.

## Testing and Verification

Minimum verification:

- `npm run build`
- Manual visual test in normal mode.
- Manual visual test in desktop mode.
- Drag each custom cat, release with physics on, and confirm it falls back to ground.
- Command each custom cat through walk, sit, nap, jump, and call.
- Summon and hide catalog pets.
- Confirm Martyn and Charles have no editable profile form.
- Confirm notes, tasks, timer, and stats still work.
- Confirm click-through can be enabled and safely escaped.

If the implementation extracts behavior logic into pure functions, add focused tests for behavior transitions if the project test setup is introduced.

## Implementation Phases

1. Data and type cleanup
   - Add locked custom cat definitions.
   - Add catalog definitions.
   - Add storage schema handling.

2. Behavior engine extraction
   - Move runtime creation, reconciliation, bounds, and transitions out of `App.tsx`.
   - Add new personality states.

3. Authored cat avatars
   - Build Charles avatar.
   - Build Martyn avatar.
   - Wire behavior-specific pose differences.

4. Companion tray and command UI
   - Replace editor rail with fixed custom-cat entries and catalog summon controls.
   - Keep command buttons and core settings.

5. Desktop polish
   - Wire click-through UI.
   - Improve desktop mode chrome behavior.
   - Confirm resizing and bounds.

6. Verification and tuning
   - Run build.
   - Manually tune movement weights, sizes, and pose timing against the references.

## Acceptance Criteria

- Martyn and Charles are the only custom cats and are not editable.
- Martyn and Charles are visually distinct and recognizable from the reference folders.
- Charles behavior feels more loungey and stretchy.
- Martyn behavior feels more watchful and grounded.
- Original-style pets remain available as summonable catalog companions.
- The app feels more like a compact desktop companion utility than a profile editor.
- Existing productivity tools remain usable.
- The app builds successfully.
- Desktop mode and click-through are usable without trapping the user.

## Risks

- Authored SVG avatars may need tuning after visual inspection at real desktop sizes.
- Click-through can create a poor recovery experience if it is exposed without an escape path.
- Local storage migration needs care so old prototype data does not reintroduce editable generic pets as the primary experience.
- Keeping all UI in `App.tsx` would make later behavior tuning harder, so behavior extraction should happen early.

## Approved Direction

Use a hybrid approach: two fixed, authored custom cats at the center of the experience, with the rest of the app acting like the original Desktop Pet Engine catalog and utility shell.

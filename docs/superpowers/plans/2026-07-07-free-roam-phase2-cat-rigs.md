# Free-Roam Phase 2: Articulated Side-Profile Cat Rigs — Implementation Plan

> **For agentic workers:** Visual/judgment task. Author the rig with a live preview loop and verify fidelity against the reference photos in `references/martyn/` and `references/charles/`. Structural tests are server-rendered; visual fidelity is verified by the human/controller in the browser, not by a blind subagent.

**Goal:** Give Martyn and Charles articulated **side-profile** bodies with a real leg-swing walk cycle (plus tail sway, head bob, ear/blink) used while they move across the desktop, keeping the approved front-facing sticker for stationary poses.

**Architecture:** Add a shared `CatWalkRig` (side view) with SVG part-groups (far legs, body, near legs, tail, head). Palette + markings come from props so one rig draws both cats: Martyn = white coat, gray crown + gray tabby tail/white tip; Charles = white coat, orange saddle/cap + orange striped tail. `PetAvatar` routes locomotion behaviors (`walk`, and future `chase`/`zoomies`) to the rig; all other behaviors keep the existing front sticker. Walk cycle is CSS keyframes on the leg/tail groups.

**Tech Stack:** React 18, TypeScript, SVG, CSS keyframes, Vitest (server-render structural tests).

**Spec:** `docs/superpowers/specs/2026-07-07-free-roam-desktop-companions-design.md` (Martyn + Charles Articulated Rigs). Reference look: memory `pet-visual-style` + photos.

---

## Reference facts (from photos + memory)

- **Martyn** (side): bright white body/legs, dark gray patch on crown between/over the ears and dark ear backs, face otherwise all white, gray tabby striped tail with a white tip, green (yellow-green) eyes, pink nose, chunky build, tiny black toe spots on one front paw.
- **Charles** (side): white muzzle/chest/belly/legs/paws, orange tabby saddle over back + shoulders rising into a cap over the ears and forehead (down to the eyes), orange striped tail, hazel eyes, pink nose, slimmer build.
- Shared sticker language: warm-brown outline `#704c35` stroke ~5, pink inner ear/nose/paw beans, soft ground shadow, rounded friendly geometry.

## Task Completion Checklist

- [x] Task 1: `CatWalkRig` component + walk-cycle CSS + `PetAvatar` locomotion routing + structural tests
- [x] Task 2: Tune Martyn markings against reference (preview loop)
- [x] Task 3: Tune Charles markings against reference (preview loop)
- [~] Task 4: Full-app visual QA — routing + fidelity verified (tests + rig-preview screenshots); live front↔rig transition pending user confirmation in the running app

---

## File Structure

- Create `src/avatars/CatWalkRig.tsx` — shared side-profile articulated rig. Props: `{ pet, facingClassName?, markings: "martyn" | "charles" }`. Groups with stable classNames: `rig-cat pose-walk`, `.leg.leg-back-far`, `.leg.leg-front-far`, `.leg.leg-back-near`, `.leg.leg-front-near`, `.rig-tail`, `.rig-head`, `.rig-body`.
- Create `src/avatars/CatWalkRig.test.tsx` — server-render both markings; assert identity label, `rig-cat`, `pose-walk`, and all four leg classes + `rig-tail` present.
- Modify `src/PetAvatar.tsx` — add `isLocomotion(behavior)` helper (`walk` for now); for `martyn`/`charles` avatars, render `CatWalkRig` when locomoting, else the existing front sticker. No change to catalog pets.
- Modify `src/styles.css` — walk-cycle keyframes: two diagonal leg pairs in opposite phase, subtle body bob and tail sway; respect `prefers-reduced-motion`.

---

### Task 1: CatWalkRig + walk CSS + routing + tests

**Files:** Create `src/avatars/CatWalkRig.tsx`, `src/avatars/CatWalkRig.test.tsx`; Modify `src/PetAvatar.tsx`, `src/styles.css`.

- [ ] **Step 1: Write the failing structural test** — `src/avatars/CatWalkRig.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "../data";
import { CatWalkRig } from "./CatWalkRig";

const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
const charles = customCompanions.find((pet) => pet.id === "charles")!;

describe("CatWalkRig", () => {
  it("renders Martyn's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={martyn} markings="martyn" />);
    expect(markup).toContain("Martyn");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("pose-walk");
    for (const leg of ["leg-back-far", "leg-front-far", "leg-back-near", "leg-front-near"]) {
      expect(markup).toContain(leg);
    }
    expect(markup).toContain("rig-tail");
  });

  it("renders Charles's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={charles} markings="charles" />);
    expect(markup).toContain("Charles");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("leg-front-near");
    expect(markup).toContain("rig-tail");
  });
});
```

- [ ] **Step 2: Run it — expect FAIL** (`npm test -- src/avatars/CatWalkRig.test.tsx`).

- [ ] **Step 3: Implement `src/avatars/CatWalkRig.tsx`** — a side-profile rig in a `viewBox="0 0 200 150"` SVG. Draw back (far) legs first, then body, then tail behind, then near legs, then head. Each leg is its own `<g class="leg leg-...">` with `transform-origin` at the hip so CSS can swing it. Markings switch coat overlays: `martyn` → gray crown patch on head + gray tabby tail with white tip; `charles` → orange saddle over back + orange cap over head + orange striped tail. Use `pet.primaryColor` for the white coat base, `pet.secondaryColor` for the marking color, `#704c35` outline, pink `#e8949c` nose. Head class `rig-head`, body `rig-body`, tail `rig-tail`. Root group `class="rig-cat pose-walk"`. Wrap in an `<svg className="pet-svg sticker-pet">` with `role="img" aria-label={`${pet.name} ${pet.breedLabel}`}` and a soft ground shadow ellipse. (Author the paths in the preview loop; the controller refines Martyn/Charles art in Tasks 2–3.)

- [ ] **Step 4: Route locomotion in `src/PetAvatar.tsx`** — add:

```tsx
const LOCOMOTION: Behavior[] = ["walk"];
function isLocomotion(behavior: Behavior) {
  return LOCOMOTION.includes(behavior);
}
```

In the `martyn`/`charles` cases, return `<CatWalkRig pet={pet} markings={pet.avatar} />` when `isLocomotion(behavior)`, else the existing `MartynAvatar`/`CharlesAvatar`. Import `CatWalkRig`.

- [ ] **Step 5: Add walk-cycle CSS to `src/styles.css`**:

```css
.rig-cat .leg {
  transform-box: fill-box;
  transform-origin: 50% 0%;
}
.pose-walk .leg-back-far,
.pose-walk .leg-front-near {
  animation: cat-step 0.5s ease-in-out infinite;
}
.pose-walk .leg-front-far,
.pose-walk .leg-back-near {
  animation: cat-step 0.5s ease-in-out infinite;
  animation-delay: -0.25s;
}
.pose-walk .rig-tail {
  transform-box: fill-box;
  transform-origin: 0% 50%;
  animation: cat-tail 1s ease-in-out infinite;
}
.pose-walk .rig-body {
  animation: cat-bob 0.5s ease-in-out infinite;
}
@keyframes cat-step {
  0%, 100% { transform: rotate(16deg); }
  50% { transform: rotate(-16deg); }
}
@keyframes cat-tail {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(10deg); }
}
@keyframes cat-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}
@media (prefers-reduced-motion: reduce) {
  .pose-walk .leg, .pose-walk .rig-tail, .pose-walk .rig-body { animation: none; }
}
```

- [ ] **Step 6:** `npm test -- src/avatars/CatWalkRig.test.tsx` (PASS), then `npm test` and `npm run build` (both PASS).

- [ ] **Step 7: Commit** — `git add src/avatars/CatWalkRig.tsx src/avatars/CatWalkRig.test.tsx src/PetAvatar.tsx src/styles.css && git commit -m "feat: add articulated side-profile cat walk rig"`.

---

### Task 2: Tune Martyn markings (preview loop)

**Files:** Modify `src/avatars/CatWalkRig.tsx`.

- [ ] Render Martyn walking in the browser preview at desktop size. Compare against `references/martyn/` photos. Verify: all-white coat, gray crown patch on the head only (face white), gray tabby tail with white tip, green eyes, pink nose, chunky body, legs swing readably. Adjust paths/colors until it clearly reads as Martyn. Keep tests green. Commit `fix: tune Martyn walk rig to reference`.

---

### Task 3: Tune Charles markings (preview loop)

**Files:** Modify `src/avatars/CatWalkRig.tsx`.

- [ ] Render Charles walking in the preview. Compare against `references/charles/` photos (esp. the side-profile shot). Verify: white underside/legs/muzzle, orange saddle over the back rising to an orange cap over the ears/forehead, orange striped tail, hazel eyes, slimmer than Martyn. Adjust until it reads as Charles. Keep tests green. Commit `fix: tune Charles walk rig to reference`.

---

### Task 4: Full-app visual QA

- [ ] In the preview, drive both cats through walk and stationary states; confirm the rig shows only while walking and the front sticker returns when they stop, with no popping/flicker at the transition. Confirm facing flips correctly with direction (parent `scaleX`). Run `npm test` and `npm run build` (green). Commit any final tweaks. Mark checklist complete.
```

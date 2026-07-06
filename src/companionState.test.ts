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

  it("falls back to a locked companion when no companions are summoned at all", () => {
    const companions = initialCompanionState.companions.map((pet) => ({ ...pet, summoned: false }));

    expect(getSummonedCompanions(companions)).toHaveLength(0);
    expect(findSelectedCompanion(companions, "missing")?.locked).toBe(true);
  });
});

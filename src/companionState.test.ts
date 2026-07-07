import { describe, expect, it } from "vitest";
import { customCompanions, initialCompanionState } from "./data";
import {
  COMPANION_SCHEMA_VERSION,
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
    expect(updated.find((pet) => pet.id === "charles")?.energy).toBe(
      customCompanions.find((pet) => pet.id === "charles")?.energy
    );
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

  it("returns defaults for legacy or junk normalization input", () => {
    const oldPets = [
      { id: "patch", name: "Edited Patch", species: "cat", pattern: "patch-cat" },
      { id: "charles", name: "Wrong Name", species: "cat", pattern: "tabby" }
    ];

    const migrated = normalizeCompanionState(oldPets);
    const junk = normalizeCompanionState("nope");

    expect(migrated.schemaVersion).toBe(COMPANION_SCHEMA_VERSION);
    expect(migrated.companions).toEqual(initialCompanionState.companions);
    expect(junk).toEqual(initialCompanionState);
  });

  it("falls back to a restorable built-in companion when every companion is hidden", () => {
    const companions = initialCompanionState.companions.map((pet) => ({ ...pet, summoned: false }));

    expect(getSummonedCompanions(companions)).toHaveLength(0);
    expect(findSelectedCompanion(companions, "missing")?.id).toBe("martyn");
  });
});

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

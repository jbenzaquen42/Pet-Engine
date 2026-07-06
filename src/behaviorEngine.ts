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

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

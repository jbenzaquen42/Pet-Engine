import type { Behavior, EngineSettings, PetProfile, PetRuntime } from "./types";

export interface StageBounds {
  width: number;
  height: number;
}

export interface FollowContext {
  active: boolean;
  pounce: boolean;
  cursor: { x: number; y: number } | null;
  cursorIdleMs: number;
}

const IDLE_FOLLOW: FollowContext = { active: false, pounce: false, cursor: null, cursorIdleMs: 0 };

const BASE_PET_SIZE = 150;

export function createInitialRuntime(pets: PetProfile[], bounds: StageBounds = { width: 900, height: 520 }): PetRuntime[] {
  const now = performance.now();
  const settings = defaultScaleSettings();
  const largestSize = pets.reduce((max, pet) => Math.max(max, getPetSize(pet, settings)), 0);
  const maxX = Math.max(8, bounds.width - largestSize - 8);
  // Spread spawns a full pet-width apart so companions don't stack on each other.
  const spacing = pets.length > 1 ? Math.min(largestSize + 16, (maxX - 24) / (pets.length - 1)) : 0;
  return pets.map((pet, index) => ({
    id: pet.id,
    x: clamp(24 + index * spacing, 8, Math.max(8, bounds.width - getPetSize(pet, settings) - 8)),
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
  random: () => number = Math.random,
  follow: FollowContext = IDLE_FOLLOW
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

  // Follow mode steers the pet toward the cursor (and lets cats pounce),
  // but never interrupts an airborne state.
  if (
    follow.active &&
    follow.cursor &&
    next.behavior !== "jump" &&
    next.behavior !== "fall" &&
    next.behavior !== "toss"
  ) {
    return applyFollow(next, pet, settings, bounds, delta, now, follow, ground, maxX, size);
  }

  if (!settings.physics && (next.behavior === "fall" || next.behavior === "toss")) {
    return { ...next, y: ground, vx: 0, rotation: 0, behavior: "idle", stateStartedAt: now };
  }

  // Toss: thrown pet arcs under gravity, spins, bounces off side walls, lands on its feet.
  if (next.behavior === "toss") {
    const vx = (next.vx ?? 0) * 0.995;
    const vy = (next.vy ?? 0) + 0.9;
    let x = next.x + vx;
    let bounceVx = vx;
    if (x <= 8) {
      x = 8;
      bounceVx = Math.abs(vx) * 0.6;
    } else if (x >= maxX) {
      x = maxX;
      bounceVx = -Math.abs(vx) * 0.6;
    }
    const y = next.y + vy;
    const rotation = (next.rotation ?? 0) + vx * 6;
    if (y >= ground) {
      return { ...next, x, y: ground, vx: 0, vy: 0, rotation: 0, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, x, y, vx: bounceVx, vy, rotation };
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

  // Greet: hold a nose-boop facing, then return to idle.
  if (next.behavior === "greet") {
    if (elapsed > 900) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  // React: a brief happy pose after a click, then back to idle.
  if (next.behavior === "react") {
    if (elapsed > 850) {
      return { ...next, y: ground, behavior: "idle", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }

  // Zoomies: a fast sprint to a target edge, then a skidding sit.
  if (next.behavior === "zoomies") {
    const target = next.targetX ?? (next.direction === 1 ? maxX : 8);
    const direction: 1 | -1 = target > next.x ? 1 : -1;
    const zoomStep = (2.2 + pet.speed * 2.4) * settings.globalSpeed * (delta / 16.67);
    const x = clamp(next.x + zoomStep * direction, 8, maxX);
    const reached = Math.abs(x - target) < 6 || x <= 8 || x >= maxX;
    if (reached || elapsed > 2600) {
      return { ...next, x, y: ground, direction, behavior: "sit", targetX: undefined, stateStartedAt: now };
    }
    return { ...next, x, y: ground, direction };
  }

  if (next.behavior === "idle") {
    // Rare zoomies burst, more likely for high-energy companions.
    if (elapsed > 1400 && random() < 0.0016 + pet.energy * 0.004) {
      const target = random() > 0.5 ? maxX : 8;
      return {
        ...next,
        y: ground,
        behavior: "zoomies",
        targetX: target,
        direction: target > next.x ? 1 : -1,
        stateStartedAt: now
      };
    }
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

/**
 * Ambient pet-to-pet interactions: two nearby, resting cats occasionally
 * greet (nose boop), nap together, or one chases the other off. Pure — runs
 * as a pre-pass over all runtimes before advanceCompanion each tick.
 */
export function applyNeighbors(
  runtimes: PetRuntime[],
  pets: PetProfile[],
  bounds: StageBounds,
  now: number,
  random: () => number = Math.random
): PetRuntime[] {
  const petById = new Map(pets.map((pet) => [pet.id, pet]));
  const resting = runtimes.filter((runtime) => {
    const pet = petById.get(runtime.id);
    return pet && pet.species === "cat" && (runtime.behavior === "idle" || runtime.behavior === "sit");
  });
  if (resting.length < 2) {
    return runtimes;
  }

  const [a, b] = resting;
  const dist = Math.abs(a.x - b.x);
  const cooldownOk = now - a.lastInteractionAt > 6000 && now - b.lastInteractionAt > 6000;
  if (dist > 140 || !cooldownOk) {
    return runtimes;
  }
  if (random() > 0.006) {
    return runtimes;
  }

  const roll = random();
  const updates = new Map<string, Partial<PetRuntime>>();
  if (roll < 0.4) {
    updates.set(a.id, { behavior: "sleep", stateStartedAt: now, lastInteractionAt: now });
    updates.set(b.id, { behavior: "sleep", stateStartedAt: now, lastInteractionAt: now });
  } else if (roll < 0.82) {
    updates.set(a.id, { behavior: "greet", direction: b.x > a.x ? 1 : -1, stateStartedAt: now, lastInteractionAt: now });
    updates.set(b.id, { behavior: "greet", direction: a.x > b.x ? 1 : -1, stateStartedAt: now, lastInteractionAt: now });
  } else {
    updates.set(a.id, {
      behavior: "chase",
      direction: b.x > a.x ? 1 : -1,
      targetX: b.x,
      stateStartedAt: now,
      lastInteractionAt: now
    });
    updates.set(b.id, {
      behavior: "zoomies",
      direction: a.x > b.x ? -1 : 1,
      targetX: a.x > b.x ? 8 : bounds.width,
      stateStartedAt: now,
      lastInteractionAt: now
    });
  }
  return runtimes.map((runtime) => (updates.has(runtime.id) ? { ...runtime, ...updates.get(runtime.id) } : runtime));
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

function applyFollow(
  next: PetRuntime,
  pet: PetProfile,
  settings: EngineSettings,
  _bounds: StageBounds,
  delta: number,
  now: number,
  follow: FollowContext,
  ground: number,
  maxX: number,
  size: number
): PetRuntime {
  const cursor = follow.cursor!;
  const target = clamp(cursor.x - size / 2, 8, maxX);
  const dx = target - next.x;
  const dist = Math.abs(dx);
  const arrive = Math.max(28, size * 0.5);
  const canPounce = follow.pounce && pet.species === "cat";
  const elapsed = now - next.stateStartedAt;

  // Pounce state machine: crouch (stalk) then leap (pounce), then watch again.
  if (next.behavior === "stalk") {
    if (elapsed > 620) {
      return { ...next, y: ground, behavior: "pounce", stateStartedAt: now };
    }
    return { ...next, y: ground };
  }
  if (next.behavior === "pounce") {
    const progress = Math.min(1, elapsed / 380);
    const y = ground - Math.sin(progress * Math.PI) * (34 + pet.energy * 26);
    const x = clamp(next.x + dx * 0.16, 8, maxX);
    if (progress >= 1) {
      return { ...next, x, y: ground, behavior: "watch", stateStartedAt: now };
    }
    return { ...next, x, y };
  }

  if (dist > arrive) {
    const step = Math.min(dist, (0.9 + pet.speed * 1.3) * settings.globalSpeed * (delta / 16.67));
    const direction: 1 | -1 = dx >= 0 ? 1 : -1;
    const behavior: Behavior = dist > 320 ? "chase" : "walk";
    const stateStartedAt = next.behavior === behavior ? next.stateStartedAt : now;
    return { ...next, x: clamp(next.x + step * direction, 8, maxX), y: ground, direction, behavior, stateStartedAt };
  }

  // Arrived: face the cursor. Cats pounce once the cursor has held still a beat.
  const direction: 1 | -1 = dx >= 0 ? 1 : -1;
  if (canPounce && follow.cursorIdleMs > 1400) {
    return { ...next, y: ground, direction, behavior: "stalk", stateStartedAt: now };
  }
  return {
    ...next,
    y: ground,
    direction,
    behavior: "watch",
    stateStartedAt: next.behavior === "watch" ? next.stateStartedAt : now
  };
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
    followMode: false,
    pounce: false,
    fountain: { enabled: false, x: 0.7 },
    globalScale: 1,
    globalSpeed: 1
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

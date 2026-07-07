import { describe, expect, it } from "vitest";
import { customCompanions, initialSettings } from "./data";
import {
  advanceCompanion,
  applyFountain,
  applyNeighbors,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime
} from "./behaviorEngine";
import type { FollowContext } from "./behaviorEngine";
import type { PetRuntime } from "./types";

const bounds = { width: 900, height: 520 };
const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
const charles = customCompanions.find((pet) => pet.id === "charles")!;

function runtimeFor(id: string, patch: Partial<PetRuntime> = {}): PetRuntime {
  return {
    id,
    x: 100,
    y: 320,
    direction: 1,
    behavior: "idle",
    vy: 0,
    phase: 0,
    stateStartedAt: 0,
    lastInteractionAt: 0,
    ...patch
  };
}

describe("behavior engine", () => {
  it("creates bounded runtime for each summoned companion", () => {
    const runtimes = createInitialRuntime([martyn, charles], bounds);

    expect(runtimes).toHaveLength(2);
    expect(runtimes[0].id).toBe("martyn");
    expect(runtimes[0].x).toBeGreaterThanOrEqual(8);
    expect(runtimes[0].y).toBe(getGroundY(martyn, initialSettings, bounds.height));
  });

  it("reconciles runtime by dropping missing ids and adding new companions", () => {
    const current = [runtimeFor("missing"), runtimeFor("martyn")];
    const reconciled = reconcileRuntime(current, [martyn, charles], bounds);

    expect(reconciled.map((runtime) => runtime.id)).toEqual(["martyn", "charles"]);
  });

  it("turns an idle Charles into stretch when the weighted roll lands in stretch", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { behavior: "idle", stateStartedAt: 0 }),
      charles,
      initialSettings,
      bounds,
      16.67,
      2500,
      () => 0.82
    );

    expect(next.behavior).toBe("stretch");
  });

  it("turns an idle Martyn into watch when the weighted roll lands in watch", () => {
    const next = advanceCompanion(
      runtimeFor("martyn", { behavior: "idle", stateStartedAt: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      2500,
      () => 0.88
    );

    expect(next.behavior).toBe("watch");
  });

  it("lands falling companions on the ground", () => {
    const ground = getGroundY(martyn, initialSettings, bounds.height);
    const next = advanceCompanion(
      runtimeFor("martyn", { behavior: "fall", y: ground - 2, vy: 6 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0
    );

    expect(next.behavior).toBe("idle");
    expect(next.y).toBe(ground);
    expect(next.vy).toBe(0);
  });

  it("commands behavior and sets fall velocity only for fall", () => {
    expect(commandRuntime(runtimeFor("martyn"), "jump", 1200).behavior).toBe("jump");
    expect(commandRuntime(runtimeFor("martyn"), "fall", 1200).vy).toBe(1);
  });

  it("uses size and global scale together", () => {
    expect(getPetSize(martyn, { ...initialSettings, globalScale: 1.25 })).toBeGreaterThan(getPetSize(martyn, initialSettings));
  });
});

describe("follow mode", () => {
  it("walks toward a far cursor and faces it", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { x: 100, behavior: "idle" }),
      charles,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 700, y: 300 }, cursorIdleMs: 0 }
    );
    expect(next.x).toBeGreaterThan(100);
    expect(next.direction).toBe(1);
    expect(["walk", "chase"]).toContain(next.behavior);
  });

  it("watches the cursor once it has arrived", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { x: 300, behavior: "walk" }),
      charles,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 320, y: 300 }, cursorIdleMs: 0 }
    );
    expect(next.behavior).toBe("watch");
  });

  it("makes a cat stalk then pounce when the cursor sits still nearby", () => {
    const follow: FollowContext = { active: true, pounce: true, cursor: { x: 320, y: 300 }, cursorIdleMs: 1600 };
    const stalking = advanceCompanion(
      runtimeFor("martyn", { x: 300, behavior: "watch", stateStartedAt: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5,
      follow
    );
    expect(stalking.behavior).toBe("stalk");

    const pouncing = advanceCompanion(
      { ...stalking, stateStartedAt: 0 },
      martyn,
      initialSettings,
      bounds,
      16.67,
      700,
      () => 0.5,
      follow
    );
    expect(pouncing.behavior).toBe("pounce");
  });

  it("does not pounce when pounce is disabled", () => {
    const next = advanceCompanion(
      runtimeFor("martyn", { x: 300, behavior: "watch", stateStartedAt: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5,
      { active: true, pounce: false, cursor: { x: 320, y: 300 }, cursorIdleMs: 5000 }
    );
    expect(next.behavior).toBe("watch");
  });

  it("ignores follow while being dragged", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { behavior: "drag" }),
      charles,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5,
      { active: true, pounce: true, cursor: { x: 700, y: 300 }, cursorIdleMs: 5000 }
    );
    expect(next.behavior).toBe("drag");
  });
});

describe("grab and toss", () => {
  it("carries a tossed pet sideways and spins it mid-air", () => {
    const mid = advanceCompanion(
      runtimeFor("martyn", { behavior: "toss", x: 200, y: 100, vx: 6, vy: -4, rotation: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(mid.behavior).toBe("toss");
    expect(mid.x).toBeGreaterThan(200);
    expect(mid.rotation).not.toBe(0);
  });

  it("lands a tossed pet on its feet and clears spin/velocity", () => {
    const ground = getGroundY(martyn, initialSettings, bounds.height);
    const landed = advanceCompanion(
      runtimeFor("martyn", { behavior: "toss", x: 200, y: ground - 1, vx: 2, vy: 5, rotation: 40 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(landed.behavior).toBe("idle");
    expect(landed.y).toBe(ground);
    expect(landed.rotation).toBe(0);
    expect(landed.vx).toBe(0);
  });

  it("settles instead of tossing when physics is off", () => {
    const ground = getGroundY(martyn, initialSettings, bounds.height);
    const settled = advanceCompanion(
      runtimeFor("martyn", { behavior: "toss", x: 200, y: 100, vx: 6, vy: -4 }),
      martyn,
      { ...initialSettings, physics: false },
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(settled.behavior).toBe("idle");
    expect(settled.y).toBe(ground);
  });
});

describe("zoomies", () => {
  it("bursts into zoomies from idle when the roll lands in the window", () => {
    const next = advanceCompanion(
      runtimeFor("charles", { behavior: "idle", x: 300, stateStartedAt: 0 }),
      charles,
      initialSettings,
      bounds,
      16.67,
      2000,
      () => 0
    );
    expect(next.behavior).toBe("zoomies");
    expect(next.targetX).toBeDefined();
  });

  it("sprints faster than a normal walk", () => {
    const zoom = advanceCompanion(
      runtimeFor("charles", { behavior: "zoomies", x: 300, targetX: 800, direction: 1 }),
      charles,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    const walk = advanceCompanion(
      runtimeFor("charles", { behavior: "walk", x: 300, direction: 1 }),
      charles,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(zoom.x - 300).toBeGreaterThan(walk.x - 300);
  });
});

describe("click reaction", () => {
  it("holds the react pose briefly then returns to idle", () => {
    const held = advanceCompanion(
      runtimeFor("martyn", { behavior: "react", stateStartedAt: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      100,
      () => 0.5
    );
    expect(held.behavior).toBe("react");

    const done = advanceCompanion(
      runtimeFor("martyn", { behavior: "react", stateStartedAt: 0 }),
      martyn,
      initialSettings,
      bounds,
      16.67,
      1000,
      () => 0.5
    );
    expect(done.behavior).toBe("idle");
  });
});

describe("charles fountain", () => {
  const enabled = { ...initialSettings, fountain: { enabled: true, x: 0.7 } };

  it("sends Charles to drink when the roll lands and the fountain is on", () => {
    const runtimes = [runtimeFor("charles", { behavior: "idle", lastInteractionAt: 0 })];
    const result = applyFountain(runtimes, [charles], enabled, bounds, 10000, () => 0);
    expect(result[0].behavior).toBe("drink");
    expect(result[0].targetX).toBeGreaterThan(0);
  });

  it("never sends Martyn to the fountain", () => {
    const runtimes = [runtimeFor("martyn", { behavior: "idle", lastInteractionAt: 0 })];
    const result = applyFountain(runtimes, [martyn], enabled, bounds, 10000, () => 0);
    expect(result[0].behavior).toBe("idle");
  });

  it("is a no-op when the fountain is disabled", () => {
    const runtimes = [runtimeFor("charles", { behavior: "idle", lastInteractionAt: 0 })];
    const disabled = { ...initialSettings, fountain: { enabled: false, x: 0.7 } };
    const result = applyFountain(runtimes, [charles], disabled, bounds, 10000, () => 0);
    expect(result).toBe(runtimes);
  });
});

describe("pet-to-pet interactions", () => {
  const restingCats = () => [
    runtimeFor("martyn", { x: 300, behavior: "idle", lastInteractionAt: 0 }),
    runtimeFor("charles", { x: 360, behavior: "idle", lastInteractionAt: 0 })
  ];

  it("naps two nearby resting cats together on a low roll", () => {
    const result = applyNeighbors(restingCats(), [martyn, charles], bounds, 10000, () => 0);
    expect(result.map((runtime) => runtime.behavior)).toEqual(["sleep", "sleep"]);
  });

  it("leaves cats alone when they are far apart", () => {
    const far = [
      runtimeFor("martyn", { x: 100, behavior: "idle", lastInteractionAt: 0 }),
      runtimeFor("charles", { x: 800, behavior: "idle", lastInteractionAt: 0 })
    ];
    const result = applyNeighbors(far, [martyn, charles], bounds, 10000, () => 0);
    expect(result).toBe(far);
  });

  it("does nothing while the interaction is on cooldown", () => {
    const recent = [
      runtimeFor("martyn", { x: 300, behavior: "idle", lastInteractionAt: 9000 }),
      runtimeFor("charles", { x: 360, behavior: "idle", lastInteractionAt: 9000 })
    ];
    const result = applyNeighbors(recent, [martyn, charles], bounds, 10000, () => 0);
    expect(result).toBe(recent);
  });
});

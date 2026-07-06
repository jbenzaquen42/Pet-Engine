import { describe, expect, it } from "vitest";
import { customCompanions, initialSettings } from "./data";
import {
  advanceCompanion,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime
} from "./behaviorEngine";
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

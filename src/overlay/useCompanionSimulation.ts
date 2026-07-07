import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  advanceCompanion,
  clamp,
  commandRuntime,
  createInitialRuntime,
  getGroundY,
  getPetSize,
  reconcileRuntime,
  type FollowContext
} from "../behaviorEngine";
import type { Behavior, EngineSettings, PetProfile, PetRuntime } from "../types";

export interface SimulationBounds {
  width: number;
  height: number;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

const IDLE_FOLLOW: FollowContext = { active: false, pounce: false, cursor: null, cursorIdleMs: 0 };

interface UseCompanionSimulationArgs {
  companions: PetProfile[];
  settings: EngineSettings;
  getBounds: () => SimulationBounds;
  getFollow?: () => FollowContext;
}

export function useCompanionSimulation({
  companions,
  settings,
  getBounds,
  getFollow
}: UseCompanionSimulationArgs) {
  const [runtime, setRuntime] = useState<PetRuntime[]>(() => createInitialRuntime(companions, getBounds()));
  const dragRef = useRef<DragState | null>(null);
  const lastFrameRef = useRef<number>(performance.now());

  useEffect(() => {
    setRuntime((current) => reconcileRuntime(current, companions, getBounds()));
  }, [companions, getBounds]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const delta = Math.min(32, now - lastFrameRef.current);
      lastFrameRef.current = now;
      const bounds = getBounds();
      const follow = getFollow ? getFollow() : IDLE_FOLLOW;
      setRuntime((current) =>
        current.map((petRuntime) => {
          if (dragRef.current?.id === petRuntime.id) {
            return petRuntime;
          }
          const pet = companions.find((profile) => profile.id === petRuntime.id);
          if (!pet) {
            return petRuntime;
          }
          return advanceCompanion(petRuntime, pet, settings, bounds, delta, now, Math.random, follow);
        })
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [companions, settings, getBounds, getFollow]);

  const beginDrag = useCallback((id: string, clientX: number, clientY: number) => {
    setRuntime((current) => {
      const entry = current.find((petRuntime) => petRuntime.id === id);
      if (entry) {
        dragRef.current = { id, offsetX: clientX - entry.x, offsetY: clientY - entry.y };
      }
      return current.map((petRuntime) =>
        petRuntime.id === id
          ? { ...petRuntime, behavior: "drag", vy: 0, stateStartedAt: performance.now() }
          : petRuntime
      );
    });
  }, []);

  const dragPet = useCallback(
    (clientX: number, clientY: number) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const bounds = getBounds();
      const pet = companions.find((profile) => profile.id === drag.id);
      if (!pet) {
        return;
      }
      const size = getPetSize(pet, settings);
      const nextX = clamp(clientX - drag.offsetX, 8, Math.max(8, bounds.width - size - 8));
      const nextY = clamp(clientY - drag.offsetY, 16, Math.max(16, bounds.height - size * 0.8 - 22));
      setRuntime((current) =>
        current.map((petRuntime) =>
          petRuntime.id === drag.id
            ? { ...petRuntime, x: nextX, y: nextY, behavior: "drag", vy: 0, stateStartedAt: performance.now() }
            : petRuntime
        )
      );
    },
    [companions, settings, getBounds]
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) {
      return;
    }
    const bounds = getBounds();
    const pet = companions.find((profile) => profile.id === drag.id);
    if (!pet) {
      return;
    }
    const ground = getGroundY(pet, settings, bounds.height);
    setRuntime((current) =>
      current.map((petRuntime) =>
        petRuntime.id === drag.id
          ? {
              ...petRuntime,
              behavior: petRuntime.y < ground - 4 && settings.physics ? "fall" : "idle",
              vy: 0,
              y: settings.physics ? petRuntime.y : ground,
              stateStartedAt: performance.now()
            }
          : petRuntime
      )
    );
  }, [companions, settings, getBounds]);

  const command = useCallback((behavior: Behavior, ids: string[]) => {
    const now = performance.now();
    setRuntime((current) =>
      current.map((petRuntime) => (ids.includes(petRuntime.id) ? commandRuntime(petRuntime, behavior, now) : petRuntime))
    );
  }, []);

  const runtimeMap = useMemo(() => new Map(runtime.map((entry) => [entry.id, entry])), [runtime]);

  return { runtime, runtimeMap, beginDrag, dragPet, endDrag, command };
}

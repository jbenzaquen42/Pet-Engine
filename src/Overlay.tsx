import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { PetAvatar } from "./PetAvatar";
import { getPetSize } from "./behaviorEngine";
import { normalizeSnapshot, type OverlaySnapshot } from "./shared/overlayBridge";
import { findPetAtPoint, type PetBox } from "./overlay/hitTest";
import { useCompanionSimulation, type SimulationBounds } from "./overlay/useCompanionSimulation";
import type { FollowContext } from "./behaviorEngine";
import { initialSettings } from "./data";

const emptySnapshot: OverlaySnapshot = { companions: [], settings: { ...initialSettings } };

export function Overlay() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(emptySnapshot);
  const interactiveRef = useRef(false);
  const draggingRef = useRef(false);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const cursorMovedAtRef = useRef(0);
  const dragSampleRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const throwRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  const getBounds = useCallback((): SimulationBounds => ({ width: window.innerWidth, height: window.innerHeight }), []);

  const followMode = snapshot.settings.followMode;
  const pounce = snapshot.settings.pounce;
  const getFollow = useCallback(
    (): FollowContext => ({
      active: Boolean(followMode) && cursorRef.current !== null,
      pounce: Boolean(pounce),
      cursor: cursorRef.current,
      cursorIdleMs: performance.now() - cursorMovedAtRef.current
    }),
    [followMode, pounce]
  );

  const { runtime, runtimeMap, beginDrag, dragPet, endDrag, command } = useCompanionSimulation({
    companions: snapshot.companions,
    settings: snapshot.settings,
    getBounds,
    getFollow
  });

  useEffect(() => {
    if (!window.petEngine) {
      return;
    }
    const unsubscribe = window.petEngine.onSnapshot((value) => setSnapshot(normalizeSnapshot(value)));
    window.petEngine.requestSnapshot();
    return unsubscribe;
  }, []);

  // Track the cursor (from the main-process pump) and when it last moved.
  useEffect(() => {
    if (!window.petEngine?.onCursor) {
      return;
    }
    return window.petEngine.onCursor((point) => {
      const prev = cursorRef.current;
      if (!point || !prev || Math.hypot(point.x - prev.x, point.y - prev.y) > 3) {
        cursorMovedAtRef.current = performance.now();
      }
      cursorRef.current = point;
    });
  }, []);

  // Apply behavior commands pushed from the panel.
  useEffect(() => {
    if (!window.petEngine?.onCommand) {
      return;
    }
    return window.petEngine.onCommand((incoming) => {
      const ids =
        incoming.target === "all"
          ? snapshot.companions.map((pet) => pet.id)
          : incoming.id
            ? [incoming.id]
            : snapshot.companions.slice(0, 1).map((pet) => pet.id);
      command(incoming.behavior, ids);
    });
  }, [command, snapshot.companions]);

  const boxes = useMemo<PetBox[]>(() => {
    return runtime
      .map((entry) => {
        const pet = snapshot.companions.find((profile) => profile.id === entry.id);
        if (!pet) {
          return null;
        }
        const size = getPetSize(pet, snapshot.settings);
        return { id: entry.id, x: entry.x, y: entry.y, width: size, height: size };
      })
      .filter((box): box is PetBox => box !== null);
  }, [runtime, snapshot]);

  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;

  useEffect(() => {
    const onMove = (event: globalThis.PointerEvent) => {
      if (draggingRef.current) {
        // Sample pointer velocity so a flick on release becomes a toss.
        const nowT = performance.now();
        const prev = dragSampleRef.current;
        if (prev) {
          const dt = Math.max(1, nowT - prev.t);
          throwRef.current = {
            vx: ((event.clientX - prev.x) / dt) * 16,
            vy: ((event.clientY - prev.y) / dt) * 16
          };
        }
        dragSampleRef.current = { x: event.clientX, y: event.clientY, t: nowT };
        dragPet(event.clientX, event.clientY);
        return;
      }
      const over = findPetAtPoint({ x: event.clientX, y: event.clientY }, boxesRef.current) !== null;
      if (over !== interactiveRef.current) {
        interactiveRef.current = over;
        window.petEngine?.setOverlayInteractive(over);
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [dragPet]);

  const onPetPointerDown = useCallback(
    (id: string, event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      dragSampleRef.current = { x: event.clientX, y: event.clientY, t: performance.now() };
      throwRef.current = { vx: 0, vy: 0 };
      beginDrag(id, event.clientX, event.clientY);
    },
    [beginDrag]
  );

  const onPetPointerUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      dragSampleRef.current = null;
      endDrag(throwRef.current.vx, throwRef.current.vy);
    }
  }, [endDrag]);

  return (
    <div className="overlay-stage">
      {snapshot.companions.map((pet) => {
        const current = runtimeMap.get(pet.id);
        if (!current) {
          return null;
        }
        const size = getPetSize(pet, snapshot.settings);
        return (
          <button
            key={pet.id}
            type="button"
            className={`overlay-pet behavior-${current.behavior}`}
            style={{
              transform: `translate3d(${current.x}px, ${current.y}px, 0) rotate(${current.rotation ?? 0}deg) scaleX(${current.direction})`,
              width: size,
              height: size
            }}
            onPointerDown={(event) => onPetPointerDown(pet.id, event)}
            onPointerUp={onPetPointerUp}
            onPointerCancel={onPetPointerUp}
          >
            <PetAvatar pet={pet} behavior={current.behavior} />
          </button>
        );
      })}
    </div>
  );
}

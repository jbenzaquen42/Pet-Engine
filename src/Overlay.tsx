import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { PetAvatar } from "./PetAvatar";
import { getPetSize } from "./behaviorEngine";
import { normalizeSnapshot, type OverlaySnapshot } from "./shared/overlayBridge";
import { findPetAtPoint, type PetBox } from "./overlay/hitTest";
import { useCompanionSimulation, type SimulationBounds } from "./overlay/useCompanionSimulation";
import { initialSettings } from "./data";

const emptySnapshot: OverlaySnapshot = { companions: [], settings: { ...initialSettings } };

export function Overlay() {
  const [snapshot, setSnapshot] = useState<OverlaySnapshot>(emptySnapshot);
  const interactiveRef = useRef(false);
  const draggingRef = useRef(false);

  const getBounds = useCallback((): SimulationBounds => ({ width: window.innerWidth, height: window.innerHeight }), []);

  const { runtime, runtimeMap, beginDrag, dragPet, endDrag } = useCompanionSimulation({
    companions: snapshot.companions,
    settings: snapshot.settings,
    getBounds
  });

  useEffect(() => {
    if (!window.petEngine) {
      return;
    }
    const unsubscribe = window.petEngine.onSnapshot((value) => setSnapshot(normalizeSnapshot(value)));
    window.petEngine.requestSnapshot();
    return unsubscribe;
  }, []);

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
      beginDrag(id, event.clientX, event.clientY);
    },
    [beginDrag]
  );

  const onPetPointerUp = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      endDrag();
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
              transform: `translate3d(${current.x}px, ${current.y}px, 0) scaleX(${current.direction})`,
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

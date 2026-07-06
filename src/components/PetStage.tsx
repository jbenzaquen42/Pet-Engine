import type { PointerEvent, RefObject } from "react";
import { PetAvatar } from "../PetAvatar";
import { getPetSize } from "../behaviorEngine";
import type { EngineSettings, PetProfile, PetRuntime } from "../types";

interface PetStageProps {
  stageRef: RefObject<HTMLDivElement>;
  companions: PetProfile[];
  runtimeMap: Map<string, PetRuntime>;
  selectedPetId: string;
  settings: EngineSettings;
  onPetPointerDown: (id: string, event: PointerEvent<HTMLButtonElement>) => void;
}

export function PetStage({ stageRef, companions, runtimeMap, selectedPetId, settings, onPetPointerDown }: PetStageProps) {
  return (
    <div className="pet-stage" ref={stageRef} aria-label="Desktop pet stage">
      <div className="stage-floor" />
      {companions.map((pet) => {
        const current = runtimeMap.get(pet.id);
        if (!current) {
          return null;
        }

        const size = getPetSize(pet, settings);
        const isSelected = pet.id === selectedPetId;

        return (
          <button
            className={`pet-actor ${isSelected ? "selected" : ""} behavior-${current.behavior}`}
            key={pet.id}
            style={{
              width: size,
              height: size * 0.84,
              transform: `translate3d(${current.x}px, ${current.y}px, 0) scaleX(${current.direction})`,
              ["--pet-phase" as string]: current.phase
            }}
            onPointerDown={(event) => onPetPointerDown(pet.id, event)}
            aria-label={`${pet.name}, ${current.behavior}`}
          >
            <span className="pet-hitbox">
              <PetAvatar pet={pet} behavior={current.behavior} />
            </span>
            {settings.showNames && (
              <span className="pet-name" style={{ transform: `scaleX(${current.direction})` }}>
                {pet.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

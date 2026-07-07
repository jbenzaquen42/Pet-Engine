import { useEffect, useRef } from "react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

interface CompanionEditorProps {
  pets: PetProfile[];
  focusedPetId: string;
  onFocus: (id: string) => void;
  onUpdatePet: (id: string, patch: Partial<PetProfile>) => void;
}

const fields = [
  { key: "size", label: "Size", min: 0.65, max: 1.4, step: 0.01 },
  { key: "speed", label: "Pace", min: 0.2, max: 1, step: 0.01 },
  { key: "energy", label: "Energy", min: 0.05, max: 1, step: 0.01 }
] as const;

export function CompanionEditor({ pets, focusedPetId, onFocus, onUpdatePet }: CompanionEditorProps) {
  const focusedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    focusedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusedPetId]);

  if (pets.length === 0) {
    return (
      <section className="companion-editor" aria-label="Companion editor">
        <h2>No companions on screen</h2>
      </section>
    );
  }

  return (
    <section className="companion-editor" aria-label="Companion editor">
      <div className="editor-cards">
        {pets.map((pet) => (
          <div
            key={pet.id}
            ref={pet.id === focusedPetId ? focusedRef : undefined}
            className={`editor-card ${pet.id === focusedPetId ? "active" : ""}`}
            onClick={() => onFocus(pet.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onFocus(pet.id);
              }
            }}
          >
            <div className="editor-card-head">
              <span className="editor-card-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span className="editor-card-title">
                <strong>{pet.name}</strong>
                <small>{pet.breedLabel}</small>
              </span>
            </div>
            <div className="editor-fields">
              {fields.map((field) => {
                const numeric = pet[field.key];
                return (
                  <label className="range-field" key={field.key}>
                    <span>
                      {field.label}
                      <strong>{`${Math.round(numeric * 100)}%`}</strong>
                    </span>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={numeric}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onUpdatePet(pet.id, { [field.key]: Number(event.target.value) } as Partial<PetProfile>)
                      }
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

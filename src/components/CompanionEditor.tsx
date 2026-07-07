import { getSharedNumberValue } from "../companionState";
import type { PetProfile } from "../types";

interface CompanionEditorProps {
  companions: PetProfile[];
  selectedPetIds: string[];
  onUpdateSelected: (patch: Partial<PetProfile>) => void;
}

const fields = [
  { key: "size", label: "Size", min: 0.65, max: 1.4, step: 0.01 },
  { key: "speed", label: "Pace", min: 0.2, max: 1, step: 0.01 },
  { key: "energy", label: "Energy", min: 0.05, max: 1, step: 0.01 }
] as const;

export function CompanionEditor({ companions, selectedPetIds, onUpdateSelected }: CompanionEditorProps) {
  const selected = companions.filter((pet) => selectedPetIds.includes(pet.id));
  if (selected.length === 0) {
    return (
      <section className="companion-editor" aria-label="Companion editor">
        <h2>No companion selected</h2>
      </section>
    );
  }

  const heading = selected.length === 1 ? selected[0].name : `${selected.length} selected`;

  return (
    <section className="companion-editor" aria-label="Companion editor">
      <div className="editor-head">
        <h2>{heading}</h2>
        <small>{selected.length === 1 ? selected[0].breedLabel : "Multi-edit"}</small>
      </div>
      <div className="editor-fields">
        {fields.map((field) => {
          const value = getSharedNumberValue(companions, selectedPetIds, field.key);
          const numeric = typeof value === "number" ? value : Number(field.min);
          return (
            <label className="range-field" key={field.key}>
              <span>
                {field.label}
                <strong>{value === "mixed" ? "Mixed" : `${Math.round(numeric * 100)}%`}</strong>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={numeric}
                onChange={(event) =>
                  onUpdateSelected({ [field.key]: Number(event.target.value) } as Partial<PetProfile>)
                }
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

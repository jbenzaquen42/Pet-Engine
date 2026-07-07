import { Check, ChevronRight, Plus, Sparkles } from "lucide-react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

interface CompanionTrayProps {
  companions: PetProfile[];
  focusedPetId: string;
  selectedPetIds: string[];
  onFocus: (id: string) => void;
  onSelectionChange: (ids: string[]) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}

function buildNextSelection(selectedPetIds: string[], petId: string, checked: boolean) {
  const next = checked ? [...selectedPetIds, petId] : selectedPetIds.filter((id) => id !== petId);
  return next.length ? next : [petId];
}

export function CompanionTray({
  companions,
  focusedPetId,
  selectedPetIds,
  onFocus,
  onSelectionChange,
  onToggleSummoned
}: CompanionTrayProps) {
  const custom = companions.filter((pet) => pet.kind === "custom");
  const catalog = companions.filter((pet) => pet.kind === "catalog");

  return (
    <aside className="companion-tray">
      <section className="tray-section">
        <div className="section-title">
          <Sparkles size={16} />
          Martyn & Charles
          <small className="selection-count">{selectedPetIds.length} selected</small>
        </div>
        <div className="pet-list">
          {custom.map((pet) => (
            <div
              className={`pet-card ${focusedPetId === pet.id ? "active" : ""}`}
              key={pet.id}
              onClick={() => onFocus(pet.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(pet.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="pet-select" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedPetIds.includes(pet.id)}
                  onChange={(event) => onSelectionChange(buildNextSelection(selectedPetIds, pet.id, event.target.checked))}
                  aria-label={`Edit ${pet.name}`}
                />
              </span>
              <span className="pet-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>
                <strong>{pet.name}</strong>
                <small>{pet.breedLabel}</small>
              </span>
              <button
                className="summon-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSummoned(pet.id, !pet.summoned);
                }}
                aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name}`}
              >
                {pet.summoned ? <Check size={14} /> : <Plus size={14} />}
              </button>
              <ChevronRight size={16} />
            </div>
          ))}
        </div>
      </section>

      <section className="tray-section catalog-section">
        <div className="section-title">Original-style catalog</div>
        <div className="pet-list">
          {catalog.map((pet) => (
            <div
              className={`pet-card ${focusedPetId === pet.id ? "active" : ""}`}
              key={pet.id}
              onClick={() => onFocus(pet.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onFocus(pet.id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <span className="pet-select" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedPetIds.includes(pet.id)}
                  onChange={(event) => onSelectionChange(buildNextSelection(selectedPetIds, pet.id, event.target.checked))}
                  aria-label={`Edit ${pet.name}`}
                />
              </span>
              <span className="pet-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>
                <strong>{pet.name}</strong>
                <small>{pet.breedLabel}</small>
              </span>
              <button
                className="summon-button"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleSummoned(pet.id, !pet.summoned);
                }}
                aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name}`}
              >
                {pet.summoned ? <Check size={14} /> : <Plus size={14} />}
              </button>
              <ChevronRight size={16} />
            </div>
          ))}
        </div>
      </section>

      <button
        className="clear-catalog"
        type="button"
        onClick={() => catalog.forEach((pet) => onToggleSummoned(pet.id, false))}
      >
        Hide catalog pets
      </button>
    </aside>
  );
}

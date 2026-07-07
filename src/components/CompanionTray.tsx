import { Check, ChevronRight, Plus, PowerOff, Sparkles } from "lucide-react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

interface CompanionTrayProps {
  companions: PetProfile[];
  focusedPetId: string;
  onFocus: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
  onHideAll: () => void;
}

interface PetRowProps {
  pet: PetProfile;
  focused: boolean;
  onFocus: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}

function PetRow({ pet, focused, onFocus, onToggleSummoned }: PetRowProps) {
  return (
    <div
      className={`pet-card ${focused ? "active" : ""}`}
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
      <button
        className="edit-button"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onFocus(pet.id);
        }}
        aria-label={`Edit ${pet.name}`}
        title={`Edit ${pet.name}`}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function CompanionTray({ companions, focusedPetId, onFocus, onToggleSummoned, onHideAll }: CompanionTrayProps) {
  const custom = companions.filter((pet) => pet.kind === "custom");
  const catalog = companions.filter((pet) => pet.kind === "catalog");
  const anySummoned = companions.some((pet) => pet.summoned);

  return (
    <aside className="companion-tray">
      <section className="tray-section">
        <div className="section-title">
          <Sparkles size={16} />
          Martyn &amp; Charles
        </div>
        <div className="pet-list">
          {custom.map((pet) => (
            <PetRow
              key={pet.id}
              pet={pet}
              focused={focusedPetId === pet.id}
              onFocus={onFocus}
              onToggleSummoned={onToggleSummoned}
            />
          ))}
        </div>
      </section>

      <section className="tray-section catalog-section">
        <div className="section-title">Original-style catalog</div>
        <div className="pet-list">
          {catalog.map((pet) => (
            <PetRow
              key={pet.id}
              pet={pet}
              focused={focusedPetId === pet.id}
              onFocus={onFocus}
              onToggleSummoned={onToggleSummoned}
            />
          ))}
        </div>
      </section>

      <div className="tray-actions">
        <button
          className="clear-catalog"
          type="button"
          onClick={() => catalog.forEach((pet) => onToggleSummoned(pet.id, false))}
        >
          Hide catalog pets
        </button>
        <button className="hide-all" type="button" onClick={onHideAll} disabled={!anySummoned}>
          <PowerOff size={14} />
          All off
        </button>
      </div>
    </aside>
  );
}

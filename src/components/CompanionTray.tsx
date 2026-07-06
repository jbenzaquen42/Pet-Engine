import { Check, ChevronRight, Plus, Sparkles, X } from "lucide-react";
import { PetAvatar } from "../PetAvatar";
import type { PetProfile } from "../types";

interface CompanionTrayProps {
  companions: PetProfile[];
  selectedPetId: string;
  onSelect: (id: string) => void;
  onToggleSummoned: (id: string, summoned: boolean) => void;
}

export function CompanionTray({ companions, selectedPetId, onSelect, onToggleSummoned }: CompanionTrayProps) {
  const custom = companions.filter((pet) => pet.kind === "custom");
  const catalog = companions.filter((pet) => pet.kind === "catalog");

  return (
    <aside className="companion-tray">
      <section className="tray-section">
        <div className="section-title">
          <Sparkles size={16} />
          Martyn & Charles
        </div>
        <div className="pet-list">
          {custom.map((pet) => (
            <button
              className={`pet-card ${selectedPetId === pet.id ? "active" : ""}`}
              key={pet.id}
              type="button"
              onClick={() => onSelect(pet.id)}
            >
              <span className="pet-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>
                <strong>{pet.name}</strong>
                <small>{pet.breedLabel} · Locked</small>
              </span>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
      </section>

      <section className="tray-section catalog-section">
        <div className="section-title">Original-style catalog</div>
        <div className="catalog-grid">
          {catalog.map((pet) => (
            <button
              className={`catalog-pet ${pet.summoned ? "summoned" : ""}`}
              key={pet.id}
              type="button"
              onClick={() => onToggleSummoned(pet.id, !pet.summoned)}
              aria-label={`${pet.summoned ? "Hide" : "Summon"} ${pet.name}`}
            >
              <span className="catalog-thumb">
                <PetAvatar pet={pet} compact />
              </span>
              <span>{pet.name}</span>
              {pet.summoned ? <Check size={14} /> : <Plus size={14} />}
            </button>
          ))}
        </div>
      </section>

      <button className="clear-catalog" type="button" onClick={() => catalog.forEach((pet) => onToggleSummoned(pet.id, false))}>
        <X size={15} />
        Hide catalog pets
      </button>
    </aside>
  );
}

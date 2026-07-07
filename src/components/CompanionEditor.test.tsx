import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getSummonedCompanions } from "../companionState";
import { initialCompanionState } from "../data";
import { CompanionEditor } from "./CompanionEditor";

const summoned = getSummonedCompanions(initialCompanionState.companions);

describe("CompanionEditor", () => {
  it("renders a card with sliders for each summoned pet", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor pets={summoned} focusedPetId="martyn" onFocus={() => undefined} onUpdatePet={() => undefined} />
    );

    expect(markup).toContain("Martyn");
    expect(markup).toContain("Charles");
    expect(markup).toContain("Size");
    expect(markup).toContain("Pace");
    expect(markup).toContain("Energy");
  });

  it("shows each pet's own value", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor pets={summoned} focusedPetId="martyn" onFocus={() => undefined} onUpdatePet={() => undefined} />
    );

    // Martyn energy 0.33, Charles energy 0.88
    expect(markup).toContain("33%");
    expect(markup).toContain("88%");
  });

  it("renders an empty state when nothing is summoned", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor pets={[]} focusedPetId="martyn" onFocus={() => undefined} onUpdatePet={() => undefined} />
    );
    expect(markup).toContain("No companions on screen");
  });
});

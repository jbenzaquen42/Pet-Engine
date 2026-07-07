import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionTray } from "./CompanionTray";

describe("CompanionTray", () => {
  it("renders summon controls for authored and catalog companions", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        focusedPetId="martyn"
        selectedPetIds={["martyn"]}
        onFocus={() => undefined}
        onSelectionChange={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Hide Martyn");
    expect(markup).toContain("Hide Charles");
    expect(markup).toContain("Summon Bag");
    expect(markup).not.toContain("Locked");
  });

  it("renders multi-select controls", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        focusedPetId="martyn"
        selectedPetIds={["martyn", "charles"]}
        onFocus={() => undefined}
        onSelectionChange={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Edit Martyn");
    expect(markup).toContain("Edit Charles");
    expect(markup).toContain("2 selected");
  });
});

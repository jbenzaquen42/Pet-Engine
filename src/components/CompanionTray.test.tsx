import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionTray } from "./CompanionTray";

describe("CompanionTray", () => {
  it("renders locked custom cats without editor controls", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        selectedPetId="martyn"
        onSelect={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Martyn");
    expect(markup).toContain("Charles");
    expect(markup).toContain("Locked");
    expect(markup).not.toContain("<input");
    expect(markup).not.toContain("<select");
  });

  it("renders catalog summon controls", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        selectedPetId="martyn"
        onSelect={() => undefined}
        onToggleSummoned={() => undefined}
      />
    );

    expect(markup).toContain("Original-style catalog");
    expect(markup).toContain("Summon Bag");
    expect(markup).toContain("Summon Patch");
  });
});

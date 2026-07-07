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
        onFocus={() => undefined}
        onToggleSummoned={() => undefined}
        onHideAll={() => undefined}
      />
    );

    expect(markup).toContain("Hide Martyn");
    expect(markup).toContain("Hide Charles");
    expect(markup).toContain("Summon Bag");
    expect(markup).not.toContain("Locked");
  });

  it("gives each pet an edit affordance instead of checkboxes", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        focusedPetId="martyn"
        onFocus={() => undefined}
        onToggleSummoned={() => undefined}
        onHideAll={() => undefined}
      />
    );

    expect(markup).toContain("Edit Martyn");
    expect(markup).toContain("Edit Charles");
    expect(markup).not.toContain('type="checkbox"');
  });

  it("renders bulk controls to hide catalog pets and turn all off", () => {
    const markup = renderToStaticMarkup(
      <CompanionTray
        companions={initialCompanionState.companions}
        focusedPetId="martyn"
        onFocus={() => undefined}
        onToggleSummoned={() => undefined}
        onHideAll={() => undefined}
      />
    );

    expect(markup).toContain("Hide catalog pets");
    expect(markup).toContain("All off");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialCompanionState } from "../data";
import { CompanionEditor } from "./CompanionEditor";

describe("CompanionEditor", () => {
  it("renders exact values for one selected pet", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor
        companions={initialCompanionState.companions}
        selectedPetIds={["martyn"]}
        onUpdateSelected={() => undefined}
      />
    );

    expect(markup).toContain("Martyn");
    expect(markup).toContain("Size");
    expect(markup).toContain("Pace");
    expect(markup).toContain("Energy");
    expect(markup).toContain("33%");
  });

  it("renders mixed values for multi-selection", () => {
    const markup = renderToStaticMarkup(
      <CompanionEditor
        companions={initialCompanionState.companions}
        selectedPetIds={["martyn", "charles"]}
        onUpdateSelected={() => undefined}
      />
    );

    expect(markup).toContain("2 selected");
    expect(markup).toContain("Mixed");
  });
});

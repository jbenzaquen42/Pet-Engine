import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "../data";
import { CatWalkRig } from "./CatWalkRig";

const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
const charles = customCompanions.find((pet) => pet.id === "charles")!;

describe("CatWalkRig", () => {
  it("renders Martyn's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={martyn} markings="martyn" />);
    expect(markup).toContain("Martyn");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("pose-walk");
    for (const leg of ["leg-back-far", "leg-front-far", "leg-back-near", "leg-front-near"]) {
      expect(markup).toContain(leg);
    }
    expect(markup).toContain("rig-tail");
  });

  it("renders Charles's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={charles} markings="charles" />);
    expect(markup).toContain("Charles");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("leg-front-near");
    expect(markup).toContain("rig-tail");
  });
});

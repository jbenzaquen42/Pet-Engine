import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "./data";
import { PetAvatar } from "./PetAvatar";

const martyn = customCompanions.find((pet) => pet.id === "martyn")!;
const charles = customCompanions.find((pet) => pet.id === "charles")!;

describe("PetAvatar custom cats", () => {
  it("renders Martyn with authored identity and watch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={martyn} behavior="watch" />);

    expect(markup).toContain("Martyn watchful house cat");
    expect(markup).toContain("martyn-avatar");
    expect(markup).toContain("pose-watch");
  });

  it("renders Charles with authored identity and stretch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={charles} behavior="stretch" />);

    expect(markup).toContain("Charles orange-and-white lounger");
    expect(markup).toContain("charles-avatar");
    expect(markup).toContain("pose-stretch");
  });
});

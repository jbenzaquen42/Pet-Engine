import { describe, expect, it } from "vitest";
import { findPetAtPoint, type PetBox } from "./hitTest";

const boxes: PetBox[] = [
  { id: "martyn", x: 0, y: 0, width: 100, height: 100 },
  { id: "charles", x: 50, y: 50, width: 100, height: 100 }
];

describe("findPetAtPoint", () => {
  it("returns null when the point is over no pet", () => {
    expect(findPetAtPoint({ x: 400, y: 400 }, boxes)).toBeNull();
  });

  it("returns the pet under the point", () => {
    expect(findPetAtPoint({ x: 10, y: 10 }, boxes)).toBe("martyn");
  });

  it("prefers the last (top-most) pet when boxes overlap", () => {
    expect(findPetAtPoint({ x: 70, y: 70 }, boxes)).toBe("charles");
  });

  it("treats edges as inside", () => {
    expect(findPetAtPoint({ x: 0, y: 0 }, boxes)).toBe("martyn");
    expect(findPetAtPoint({ x: 100, y: 0 }, boxes)).toBe("martyn");
  });
});

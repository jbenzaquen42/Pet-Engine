// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Overlay } from "./Overlay";
import { getSummonedCompanions } from "./companionState";
import { initialCompanionState, initialSettings } from "./data";

const summoned = getSummonedCompanions(initialCompanionState.companions);

beforeEach(() => {
  // The simulation schedules requestAnimationFrame; stub it to a no-op so the
  // test asserts the initial render without an ongoing animation loop.
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

describe("Overlay rendering", () => {
  it("renders a draggable pet actor for each companion delivered by the snapshot", async () => {
    const snapshot = { companions: summoned, settings: initialSettings };
    (window as unknown as { petEngine: unknown }).petEngine = {
      onSnapshot: (callback: (value: unknown) => void) => {
        callback(snapshot);
        return () => undefined;
      },
      requestSnapshot: () => undefined,
      setOverlayInteractive: () => undefined
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Overlay />);
    });

    const pets = container.querySelectorAll(".overlay-pet");
    expect(pets.length).toBe(summoned.length);
    expect(pets.length).toBeGreaterThanOrEqual(2);
    expect(container.innerHTML).toContain("Martyn");
    expect(container.innerHTML).toContain("Charles");

    await act(async () => {
      root.unmount();
    });
  });
});

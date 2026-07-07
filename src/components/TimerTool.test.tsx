import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimerTool } from "./TimerTool";

describe("TimerTool", () => {
  it("renders large timer actions and duration controls", () => {
    const markup = renderToStaticMarkup(
      <TimerTool
        timerSeconds={25 * 60}
        timerRunning={false}
        timerProgress={0}
        timerMinutes={25}
        onTimerToggle={() => undefined}
        onTimerReset={() => undefined}
        onTimerMinutesChange={() => undefined}
      />
    );

    expect(markup).toContain("25:00");
    expect(markup).toContain("Start timer");
    expect(markup).toContain("Reset timer");
    expect(markup).toContain("Decrease minutes");
    expect(markup).toContain("Increase minutes");
  });
});

// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { useAgendaClock } from "../useAgendaClock";

function Probe() {
  return <span>{useAgendaClock()}</span>;
}

describe("useAgendaClock", () => {
  it("ticks while the agenda stays open", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T12:00:00.000Z"));
    const container = document.createElement("div");
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(<Probe />);
      });
      expect(container.textContent).toBe("0");

      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });

      expect(container.textContent).toBe(String(new Date("2026-08-10T12:01:00.000Z").getTime()));
    } finally {
      await act(async () => {
        root.unmount();
      });
      vi.useRealTimers();
    }
  });
});

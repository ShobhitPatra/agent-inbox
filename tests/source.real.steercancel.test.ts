import { describe, it, expect } from "vitest";
import { createRealSource } from "../src/source/real.js";
import type { RunEvent } from "../src/model/types.js";

describe("real source steer/cancel stubs (no network)", () => {
  it("exposes steer and cancel", () => {
    const src = createRealSource();
    expect(typeof src.steer).toBe("function");
    expect(typeof src.cancel).toBe("function");
    src.dispose();
  });

  it("steer emits an echo runUpdated for the real agent", () => {
    const src = createRealSource();
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.steer("real-agent", "prioritize signup");
    const echo = events.filter((e) => e.type === "runUpdated") as Extract<RunEvent, { type: "runUpdated" }>[];
    expect(echo.some((e) => e.context.some((c) => c.kind === "reasoning" && c.text.includes("prioritize signup")))).toBe(true);
    src.dispose();
  });

  it("cancel emits a cancelled status without throwing", () => {
    const src = createRealSource();
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.cancel("real-agent");
    expect(events.some((e) => e.type === "agentStatusChanged" && e.agent.status === "cancelled")).toBe(true);
    src.dispose();
  });
});

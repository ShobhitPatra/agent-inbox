import { describe, it, expect, vi } from "vitest";
import { createSimulatedSource } from "../src/source/simulated.js";
import type { RunEvent } from "../src/model/types.js";

describe("simulated steer", () => {
  it("emits an echo runUpdated quoting the operator text", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(events.some((e) => e.type === "approvalRequested")).toBe(true));
    src.steer("demo", "focus on the login path first");
    const echo = events.filter((e) => e.type === "runUpdated") as Extract<RunEvent, { type: "runUpdated" }>[];
    expect(echo.some((e) => e.context.some((c) => c.kind === "reasoning" && c.text.includes("focus on the login path first")))).toBe(true);
    src.dispose();
  });

  it("ignores a non-matching agentId", () => {
    const src = createSimulatedSource({ stepMs: 0, agentId: "demo" });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.steer("someone-else", "noop");
    expect(events.filter((e) => e.type === "runUpdated").length).toBe(0);
    src.dispose();
  });
});

describe("simulated cancel", () => {
  it("emits cancelled status and denies each still-pending approval", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(events.filter((e) => e.type === "approvalRequested").length).toBeGreaterThanOrEqual(3));
    src.cancel("demo");
    const cancelled = events.filter((e) => e.type === "agentStatusChanged" && e.agent.status === "cancelled");
    expect(cancelled.length).toBe(1);
    const denied = events.filter((e) => e.type === "approvalResolved" && e.status === "denied") as Extract<RunEvent, { type: "approvalResolved" }>[];
    expect(denied.map((e) => e.approvalId).sort()).toEqual(["ap-edit-1", "ap-edit-2", "ap-edit-3"]);
    src.dispose();
  });

  it("settles the run loop with no further events after cancel", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(events.filter((e) => e.type === "approvalRequested").length).toBeGreaterThanOrEqual(3));
    src.cancel("demo");
    const countAfterCancel = events.length;
    await new Promise((r) => setTimeout(r, 20));
    expect(events.length).toBe(countAfterCancel);
    src.dispose();
  });
});

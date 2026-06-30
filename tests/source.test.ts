import { describe, it, expect, vi } from "vitest";
import { createSimulatedSource } from "../src/source/simulated.js";
import type { RunEvent } from "../src/model/types.js";

describe("simulated source", () => {
  it("emits a batch of 3 pending approvals before any decisions are made", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();

    await vi.waitFor(() => {
      const requested = events.filter((e) => e.type === "approvalRequested");
      expect(requested.length).toBeGreaterThanOrEqual(3);
    });

    const waiting = events.filter(
      (e) => e.type === "agentStatusChanged" && e.agent.status === "waiting",
    );
    expect(waiting.length).toBeGreaterThanOrEqual(1);

    const resolved = events.filter((e) => e.type === "approvalResolved");
    expect(resolved.length).toBe(0);

    src.dispose();
  });

  it("full run: mixed batch decisions + tail drives to agentFinished", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();

    await vi.waitFor(() => {
      const ids = events
        .filter((e) => e.type === "approvalRequested")
        .map((e) => (e as Extract<RunEvent, { type: "approvalRequested" }>).approval.id);
      expect(ids).toContain("ap-edit-1");
      expect(ids).toContain("ap-edit-2");
      expect(ids).toContain("ap-edit-3");
    });

    src.decide("ap-edit-1", { action: "approve" });
    src.decide("ap-edit-2", { action: "deny" });
    src.decide("ap-edit-3", { action: "approve" });

    await vi.waitFor(() => {
      const ids = events
        .filter((e) => e.type === "approvalRequested")
        .map((e) => (e as Extract<RunEvent, { type: "approvalRequested" }>).approval.id);
      expect(ids).toContain("ap-cmd-1");
    });

    src.decide("ap-cmd-1", { action: "approve" });

    await vi.waitFor(() => {
      const ids = events
        .filter((e) => e.type === "approvalRequested")
        .map((e) => (e as Extract<RunEvent, { type: "approvalRequested" }>).approval.id);
      expect(ids).toContain("ap-send-1");
    });

    src.decide("ap-send-1", { action: "approve" });

    await vi.waitFor(() => {
      expect(events.some((e) => e.type === "agentFinished")).toBe(true);
    });

    const resolved = events.filter(
      (e) => e.type === "approvalResolved",
    ) as Extract<RunEvent, { type: "approvalResolved" }>[];

    const deniedResolution = resolved.find((e) => e.approvalId === "ap-edit-2");
    expect(deniedResolution?.status).toBe("denied");

    const approvedIds = ["ap-edit-1", "ap-edit-3", "ap-cmd-1", "ap-send-1"];
    for (const id of approvedIds) {
      const res = resolved.find((e) => e.approvalId === id);
      expect(res?.status).toBe("approved");
    }
  });

  it("dispose() while waiting for a batch decision settles cleanly with no unhandled rejection", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();

    await vi.waitFor(() => {
      expect(events.filter((e) => e.type === "approvalRequested").length).toBeGreaterThanOrEqual(3);
    });

    const countBeforeDispose = events.length;

    src.dispose();

    await new Promise((r) => setTimeout(r, 20));

    expect(events.length).toBe(countBeforeDispose);
  });
});

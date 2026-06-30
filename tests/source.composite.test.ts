import { describe, it, expect, vi } from "vitest";
import { combineSources, createFleetSource } from "../src/source/composite.js";
import { createSimulatedSource } from "../src/source/simulated.js";
import type { RunEvent } from "../src/model/types.js";

type Requested = Extract<RunEvent, { type: "approvalRequested" }>;
type Status = Extract<RunEvent, { type: "agentStatusChanged" }>;
type Resolved = Extract<RunEvent, { type: "approvalResolved" }>;
type Updated = Extract<RunEvent, { type: "runUpdated" }>;

const requestedIds = (events: RunEvent[]) =>
  events.filter((e) => e.type === "approvalRequested").map((e) => (e as Requested).approval.id);

describe("createFleetSource", () => {
  it("drives three distinct agents into the shared event stream", async () => {
    const src = createFleetSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => {
      const ids = requestedIds(events);
      expect(ids).toContain("coder-ap-edit-1");
      expect(ids).toContain("refactor-ap-edit-1");
      expect(ids).toContain("ops-ap-cmd-1");
    });
    const agentIds = new Set((events.filter((e) => e.type === "agentStatusChanged") as Status[]).map((e) => e.agent.id));
    expect(agentIds).toEqual(new Set(["coder", "refactor", "ops"]));
    src.dispose();
  });

  it("routes steer to only the targeted child", async () => {
    const src = createFleetSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(events.some((e) => e.type === "approvalRequested")).toBe(true));
    src.steer("refactor", "keep the public API stable");
    const echoes = (events.filter((e) => e.type === "runUpdated") as Updated[]).filter(
      (e) => e.agentId === "refactor" && e.context.some((c) => c.kind === "reasoning" && c.text.includes("keep the public API stable")),
    );
    expect(echoes.length).toBe(1);
    src.dispose();
  });

  it("routes cancel to only the targeted child and denies its approvals", async () => {
    const src = createFleetSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(requestedIds(events)).toContain("ops-ap-cmd-1"));
    src.cancel("ops");
    const cancelled = (events.filter((e) => e.type === "agentStatusChanged" && e.agent.status === "cancelled") as Status[]).map((e) => e.agent.id);
    expect(cancelled).toEqual(["ops"]);
    const denied = (events.filter((e) => e.type === "approvalResolved" && e.status === "denied") as Resolved[]);
    expect(denied.length).toBeGreaterThanOrEqual(3);
    expect(denied.every((e) => e.approvalId.startsWith("ops-"))).toBe(true);
    src.dispose();
  });
});

describe("combineSources", () => {
  it("broadcasts decide; the owning child resolves while others ignore it", async () => {
    const a = createSimulatedSource({ stepMs: 0, agentId: "a", idPrefix: "a-" });
    const b = createSimulatedSource({ stepMs: 0, agentId: "b", idPrefix: "b-" });
    const src = combineSources([{ agentId: "a", source: a }, { agentId: "b", source: b }]);
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => {
      const ids = requestedIds(events);
      expect(ids).toContain("a-ap-edit-1");
      expect(ids).toContain("b-ap-edit-1");
    });
    src.decide("a-ap-edit-1", { action: "approve" });
    src.decide("a-ap-edit-2", { action: "approve" });
    src.decide("a-ap-edit-3", { action: "approve" });
    await vi.waitFor(() => {
      const resolved = events.filter((e) => e.type === "approvalResolved") as Resolved[];
      expect(resolved.some((e) => e.approvalId === "a-ap-edit-1" && e.status === "approved")).toBe(true);
    });
    const bResolved = (events.filter((e) => e.type === "approvalResolved") as Resolved[]).filter((e) => e.approvalId.startsWith("b-"));
    expect(bResolved.length).toBe(0);
    src.dispose();
  });
});

import { describe, it, expect, vi } from "vitest";
import { createSimulatedSource } from "../src/source/simulated.js";
import { createFleetSource } from "../src/source/composite.js";
import type { RunEvent } from "../src/model/types.js";

const requestedIds = (events: RunEvent[]) =>
  events
    .filter((e) => e.type === "approvalRequested")
    .map((e) => (e as Extract<RunEvent, { type: "approvalRequested" }>).approval.id);

describe("parameterized simulated source", () => {
  it("namespaces approval ids by idPrefix and uses the given agentId", async () => {
    const src = createSimulatedSource({ stepMs: 0, agentId: "coder", idPrefix: "coder-", name: "coder", task: "ship" });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(requestedIds(events)).toContain("coder-ap-edit-1"));
    const statuses = events.filter((e) => e.type === "agentStatusChanged") as Extract<RunEvent, { type: "agentStatusChanged" }>[];
    expect(statuses[0]!.agent.id).toBe("coder");
    expect(statuses[0]!.agent.name).toBe("coder");
    src.dispose();
  });

  it("emits runUpdated transcript parts as the agent works", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(events.some((e) => e.type === "runUpdated")).toBe(true));
    src.dispose();
  });

  it("carries step and cost on status changes", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => {
      const s = events.filter((e) => e.type === "agentStatusChanged") as Extract<RunEvent, { type: "agentStatusChanged" }>[];
      expect(s.length).toBeGreaterThan(0);
      expect(s[0]!.agent.step).toBeDefined();
      expect(typeof s[0]!.agent.cost).toBe("number");
    });
    src.dispose();
  });

  it("default options preserve the legacy demo ids", async () => {
    const src = createSimulatedSource({ stepMs: 0 });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(requestedIds(events)).toContain("ap-edit-1"));
    src.dispose();
  });

  it("a leading running window emits transcript notes before the agent goes waiting (so steer is live)", async () => {
    const src = createSimulatedSource({
      stepMs: 0,
      agentId: "refactor",
      idPrefix: "refactor-",
      script: {
        leadingNotes: ["Mapping the validation call sites across routes.", "Planning a shared helper extraction."],
        waves: [{ approvals: [{ idSuffix: "ap-edit-1", action: { kind: "edit", path: "src/lib/validate.ts", hunks: [{ oldString: "a", newString: "b" }] }, reasoning: "extract helper" }] }],
      },
    });
    const events: RunEvent[] = [];
    src.subscribe((e) => events.push(e));
    src.start();
    await vi.waitFor(() => expect(events.filter((e) => e.type === "runUpdated").length).toBeGreaterThanOrEqual(2));
    const firstWaiting = events.findIndex((e) => e.type === "agentStatusChanged" && e.agent.status === "waiting");
    const notesBeforeWaiting = events.filter((e, i) => e.type === "runUpdated" && (firstWaiting === -1 || i < firstWaiting)).length;
    expect(notesBeforeWaiting).toBeGreaterThanOrEqual(2);
    src.dispose();
  });
});

it("first-batch waiting status carries step >= 1 and cost > 0 for all fleet agents", async () => {
  type Status = Extract<RunEvent, { type: "agentStatusChanged" }>;
  const src = createFleetSource({ stepMs: 0 });
  const events: RunEvent[] = [];
  src.subscribe((e) => events.push(e));
  src.start();
  await vi.waitFor(() => {
    const statuses = events.filter((e) => e.type === "agentStatusChanged") as Status[];
    const firstWaitingByAgent = new Map<string, Status>();
    for (const s of statuses) {
      if (s.agent.status === "waiting" && !firstWaitingByAgent.has(s.agent.id)) {
        firstWaitingByAgent.set(s.agent.id, s);
      }
    }
    expect(firstWaitingByAgent.size).toBe(3);
    for (const [, s] of firstWaitingByAgent) {
      expect(s.agent.step?.index ?? 0).toBeGreaterThanOrEqual(1);
      expect(s.agent.cost ?? 0).toBeGreaterThan(0);
    }
  });
  src.dispose();
});

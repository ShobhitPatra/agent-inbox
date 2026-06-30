import { describe, it, expect } from "vitest";
import {
  createWaiters,
  runBatch,
  runGated,
  isDisposeSentinel,
} from "../src/source/realCore.js";
import type { RunEvent, Approval } from "../src/model/types.js";

const makeApproval = (id: string, idx: number): Approval => ({
  id,
  agentId: "real-agent",
  createdAt: Date.now() + idx,
  action: {
    kind: "edit",
    path: `src/routes/file${idx}.ts`,
    hunks: [{ oldString: "const body = req.body;", newString: "const body = schema.parse(req.body);" }],
  },
  context: [{ kind: "reasoning", text: `Add validation to file${idx}.ts` }],
});

describe("realCore: runBatch", () => {
  it("emits all approvalRequested events before any decisions are made", () => {
    const { waitDecision } = createWaiters();
    const events: RunEvent[] = [];
    const emit = (e: RunEvent) => events.push(e);

    const approvals = [makeApproval("ap1", 0), makeApproval("ap2", 1), makeApproval("ap3", 2)];

    const batchPromise = runBatch(approvals, emit, waitDecision);

    const requested = events.filter((e) => e.type === "approvalRequested");
    expect(requested.length).toBe(3);
    const resolved = events.filter((e) => e.type === "approvalResolved");
    expect(resolved.length).toBe(0);

    batchPromise.catch(() => {});
  });

  it("resolves with correct statuses when decisions are provided (approve + deny mix)", async () => {
    const { waitDecision, decide } = createWaiters();
    const events: RunEvent[] = [];
    const emit = (e: RunEvent) => events.push(e);

    const approvals = [makeApproval("b1", 0), makeApproval("b2", 1), makeApproval("b3", 2)];

    const batchPromise = runBatch(approvals, emit, waitDecision);

    decide("b1", { action: "approve" });
    decide("b2", { action: "deny" });
    decide("b3", { action: "approve" });

    const decisions = await batchPromise;

    expect(decisions[0]!.action).toBe("approve");
    expect(decisions[1]!.action).toBe("deny");
    expect(decisions[2]!.action).toBe("approve");

    const resolved = events.filter(
      (e) => e.type === "approvalResolved",
    ) as Extract<RunEvent, { type: "approvalResolved" }>[];

    expect(resolved.find((e) => e.approvalId === "b2")?.status).toBe("denied");
    expect(resolved.find((e) => e.approvalId === "b1")?.status).toBe("approved");
    expect(resolved.find((e) => e.approvalId === "b3")?.status).toBe("approved");
  });

  it("denied actions are recorded as denied but do not stop other batch items", async () => {
    const { waitDecision, decide } = createWaiters();
    const events: RunEvent[] = [];
    const emit = (e: RunEvent) => events.push(e);

    const approvals = [makeApproval("c1", 0), makeApproval("c2", 1)];
    const batchPromise = runBatch(approvals, emit, waitDecision);

    decide("c1", { action: "deny" });
    decide("c2", { action: "approve" });

    await batchPromise;

    const resolved = events.filter(
      (e) => e.type === "approvalResolved",
    ) as Extract<RunEvent, { type: "approvalResolved" }>[];
    expect(resolved.length).toBe(2);
  });
});

describe("realCore: runGated", () => {
  it("emits approvalRequested then approvalResolved on approve", async () => {
    const { waitDecision, decide } = createWaiters();
    const events: RunEvent[] = [];
    const emit = (e: RunEvent) => events.push(e);

    const approval = makeApproval("g1", 0);
    const p = runGated(approval, emit, waitDecision);

    expect(events.filter((e) => e.type === "approvalRequested").length).toBe(1);
    expect(events.filter((e) => e.type === "approvalResolved").length).toBe(0);

    decide("g1", { action: "approve" });
    const decision = await p;

    expect(decision.action).toBe("approve");
    const resolved = events.filter(
      (e) => e.type === "approvalResolved",
    ) as Extract<RunEvent, { type: "approvalResolved" }>[];
    expect(resolved[0]?.status).toBe("approved");
  });
});

describe("realCore: dispose", () => {
  it("disposeWaiters() rejects pending waits and does not produce unhandled rejections", async () => {
    const { waitDecision, disposeWaiters } = createWaiters();
    const events: RunEvent[] = [];
    const emit = (e: RunEvent) => events.push(e);

    const approval = makeApproval("d1", 0);

    const p = runGated(approval, emit, waitDecision).catch((e: unknown) => {
      if (!isDisposeSentinel(e)) throw e;
      return "disposed" as const;
    });

    expect(events.filter((e) => e.type === "approvalRequested").length).toBe(1);

    disposeWaiters();

    const result = await p;
    expect(result).toBe("disposed");

    expect(events.filter((e) => e.type === "approvalResolved").length).toBe(0);
  });

  it("dispose during batch leaves no unhandled rejections", async () => {
    const { waitDecision, disposeWaiters } = createWaiters();
    const events: RunEvent[] = [];
    const emit = (e: RunEvent) => events.push(e);

    const approvals = [makeApproval("e1", 0), makeApproval("e2", 1), makeApproval("e3", 2)];

    const p = runBatch(approvals, emit, waitDecision).catch((e: unknown) => {
      if (!isDisposeSentinel(e)) throw e;
      return [] as const;
    });

    expect(events.filter((e) => e.type === "approvalRequested").length).toBe(3);

    disposeWaiters();

    const result = await p;
    expect(result).toEqual([]);

    expect(events.filter((e) => e.type === "approvalResolved").length).toBe(0);
  });
});

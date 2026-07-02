import { it, expect } from "vitest";
import { reduce, emptyState, pendingApprovals, agentById } from "../src/model/store.js";

it("adds an agent and a pending approval, and lists it", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "a1", name: "demo", task: "validate signup", status: "running" } });
  s = reduce(s, { type: "approvalRequested", approval: {
    id: "ap1", agentId: "a1", createdAt: 1,
    action: { kind: "command", command: "npm test", cwd: "." },
    context: [{ kind: "reasoning", text: "run the suite" }],
  } });
  const pend = pendingApprovals(s);
  expect(pend.length).toBe(1);
  expect(pend[0].id).toBe("ap1");
  expect(pend[0].status).toBe("pending");
});

it("resolves an approval out of the pending list", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "a1", name: "d", task: "t", status: "running" } });
  s = reduce(s, { type: "approvalRequested", approval: { id: "ap1", agentId: "a1", createdAt: 1, action: { kind: "command", command: "ls", cwd: "." }, context: [] } });
  s = reduce(s, { type: "approvalResolved", approvalId: "ap1", status: "approved" });
  expect(pendingApprovals(s).length).toBe(0);
});

it("agentById returns the agent for a known id", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "a1", name: "demo", task: "validate", status: "running" } });
  const agent = agentById(s, "a1");
  expect(agent).toBeDefined();
  expect(agent?.id).toBe("a1");
  expect(agent?.name).toBe("demo");
});

it("agentById returns undefined for an unknown id", () => {
  expect(agentById(emptyState(), "ghost")).toBeUndefined();
});

it("approvalResolved with unknown approvalId is a safe no-op", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "a1", name: "d", task: "t", status: "running" } });
  const before = s;
  const after = reduce(s, { type: "approvalResolved", approvalId: "nonexistent", status: "approved" });
  expect(after).toBe(before);
});

it("approvalRequested with a duplicate id updates the approval in place without duplicating the order entry", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "a1", name: "d", task: "t", status: "running" } });
  s = reduce(s, {
    type: "approvalRequested",
    approval: { id: "ap1", agentId: "a1", createdAt: 1, action: { kind: "command", command: "ls", cwd: "." }, context: [] },
  });
  expect(s.order.length).toBe(1);
  expect(s.approvals["ap1"]?.action).toMatchObject({ command: "ls" });

  s = reduce(s, {
    type: "approvalRequested",
    approval: { id: "ap1", agentId: "a1", createdAt: 2, action: { kind: "command", command: "pwd", cwd: "." }, context: [] },
  });

  expect(s.order.length).toBe(1);
  expect(s.approvals["ap1"]?.action).toMatchObject({ command: "pwd" });
});

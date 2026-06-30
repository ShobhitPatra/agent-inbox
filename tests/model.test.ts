import { it, expect } from "vitest";
import { reduce, emptyState, pendingApprovals } from "../src/model/store.js";

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

import { it, expect } from "vitest";
import { reduce, emptyState, fleet, agentRun, pendingForAgent } from "../src/model/store.js";

const seeded = () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "b", name: "B", task: "t", status: "running" } });
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "a", name: "A", task: "t", status: "waiting" } });
  s = reduce(s, { type: "runUpdated", agentId: "a", context: [{ kind: "reasoning", text: "a thinking" }] });
  s = reduce(s, { type: "approvalRequested", approval: { id: "a-1", agentId: "a", createdAt: 1, action: { kind: "command", command: "ls", cwd: "." }, context: [] } });
  s = reduce(s, { type: "approvalRequested", approval: { id: "b-1", agentId: "b", createdAt: 2, action: { kind: "command", command: "ls", cwd: "." }, context: [] } });
  s = reduce(s, { type: "approvalRequested", approval: { id: "a-2", agentId: "a", createdAt: 3, action: { kind: "command", command: "ls", cwd: "." }, context: [] } });
  s = reduce(s, { type: "approvalResolved", approvalId: "a-1", status: "approved" });
  return s;
};

it("fleet returns all agents sorted by id", () => {
  expect(fleet(seeded()).map((a) => a.id)).toEqual(["a", "b"]);
});

it("agentRun returns the agent's transcript, or empty for unknown agents", () => {
  const s = seeded();
  expect(agentRun(s, "a")).toEqual([{ kind: "reasoning", text: "a thinking" }]);
  expect(agentRun(s, "zzz")).toEqual([]);
});

it("pendingForAgent returns only that agent's still-pending approvals", () => {
  const s = seeded();
  expect(pendingForAgent(s, "a").map((p) => p.id)).toEqual(["a-2"]);
  expect(pendingForAgent(s, "b").map((p) => p.id)).toEqual(["b-1"]);
});

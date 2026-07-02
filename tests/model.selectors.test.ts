import { it, expect } from "vitest";
import { reduce, emptyState, fleet, agentRun, pendingForAgent, filteredFleet, filteredPending } from "../src/model/store.js";

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

it("filteredFleet returns all agents when query is empty", () => {
  expect(filteredFleet(seeded(), "").map((a) => a.id)).toEqual(["a", "b"]);
});

it("filteredFleet matches by name case-insensitively", () => {
  expect(filteredFleet(seeded(), "A").map((a) => a.id)).toEqual(["a"]);
  expect(filteredFleet(seeded(), "a").map((a) => a.id)).toEqual(["a"]);
});

it("filteredFleet returns empty when no match", () => {
  expect(filteredFleet(seeded(), "zzz")).toEqual([]);
});

it("filteredFleet matches by status", () => {
  expect(filteredFleet(seeded(), "running").map((a) => a.id)).toEqual(["b"]);
  expect(filteredFleet(seeded(), "waiting").map((a) => a.id)).toEqual(["a"]);
});

it("filteredPending returns all pending when query is empty", () => {
  expect(filteredPending(seeded(), "").map((a) => a.id)).toEqual(["b-1", "a-2"]);
});

it("filteredPending matches by agent name case-insensitively", () => {
  expect(filteredPending(seeded(), "B").map((a) => a.id)).toEqual(["b-1"]);
  expect(filteredPending(seeded(), "b").map((a) => a.id)).toEqual(["b-1"]);
});

it("filteredPending returns empty when no match", () => {
  expect(filteredPending(seeded(), "zzz")).toEqual([]);
});

it("filteredPending matches by action label case-insensitively", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "x", name: "xbot", task: "t", status: "running" } });
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "y", name: "ybot", task: "t", status: "running" } });
  s = reduce(s, {
    type: "approvalRequested",
    approval: { id: "x-1", agentId: "x", createdAt: 1, action: { kind: "edit", path: "/src/config.ts", hunks: [] }, context: [] },
  });
  s = reduce(s, {
    type: "approvalRequested",
    approval: { id: "y-1", agentId: "y", createdAt: 2, action: { kind: "command", command: "npm run build", cwd: "." }, context: [] },
  });
  expect(filteredPending(s, "config").map((a) => a.id)).toEqual(["x-1"]);
  expect(filteredPending(s, "NPM").map((a) => a.id)).toEqual(["y-1"]);
});

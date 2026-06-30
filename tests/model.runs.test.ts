import { it, expect } from "vitest";
import { reduce, emptyState } from "../src/model/store.js";

it("emptyState includes an empty runs store", () => {
  expect(emptyState().runs).toEqual({});
});

it("runUpdated appends context parts to the agent's run transcript", () => {
  let s = emptyState();
  s = reduce(s, { type: "runUpdated", agentId: "a1", context: [{ kind: "reasoning", text: "reading files" }] });
  s = reduce(s, { type: "runUpdated", agentId: "a1", context: [{ kind: "reasoning", text: "writing edit" }] });
  expect(s.runs["a1"]).toEqual([
    { kind: "reasoning", text: "reading files" },
    { kind: "reasoning", text: "writing edit" },
  ]);
});

it("runUpdated keeps separate transcripts per agent", () => {
  let s = emptyState();
  s = reduce(s, { type: "runUpdated", agentId: "a1", context: [{ kind: "reasoning", text: "a1 step" }] });
  s = reduce(s, { type: "runUpdated", agentId: "a2", context: [{ kind: "reasoning", text: "a2 step" }] });
  expect(s.runs["a1"]).toHaveLength(1);
  expect(s.runs["a2"]).toHaveLength(1);
});

it("agentStatusChanged can carry cancelled status, step and cost", () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "a1", name: "ops", task: "t", status: "cancelled", step: { index: 2 }, cost: 0.04 },
  });
  expect(s.agents["a1"]!.status).toBe("cancelled");
  expect(s.agents["a1"]!.step).toEqual({ index: 2 });
  expect(s.agents["a1"]!.cost).toBe(0.04);
});

import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { reduce, emptyState } from "../src/model/store.js";
import { Fleet } from "../src/ui/Fleet.js";

const seeded = () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "coder", name: "coder", task: "t", status: "running", step: { index: 3 }, cost: 0.04 } });
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "ops", name: "ops", task: "t", status: "waiting", step: { index: 1 }, cost: 0.02 } });
  s = reduce(s, { type: "approvalRequested", approval: { id: "ops-1", agentId: "ops", createdAt: 1, action: { kind: "command", command: "ls", cwd: "." }, context: [] } });
  s = reduce(s, { type: "approvalRequested", approval: { id: "ops-2", agentId: "ops", createdAt: 2, action: { kind: "command", command: "ls", cwd: "." }, context: [] } });
  return s;
};

it("renders one row per agent with status, step, pending count and cost", () => {
  const { lastFrame, unmount } = render(<Fleet state={seeded()} cursor={0} armedCancel={null} />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("coder");
  expect(frame).toContain("running");
  expect(frame).toContain("step 3/?");
  expect(frame).toContain("ops");
  expect(frame).toContain("2 pending");
  expect(frame).toContain("$0.04");
  unmount();
});

it("places the cursor marker on the focused row", () => {
  const { lastFrame, unmount } = render(<Fleet state={seeded()} cursor={1} armedCancel={null} />);
  const lines = (lastFrame() ?? "").split("\n");
  const cursorLine = lines.findIndex((l) => l.includes("❯"));
  const opsLine = lines.findIndex((l) => l.includes("ops"));
  expect(cursorLine).toBe(opsLine);
  unmount();
});

it("shows the armed-cancel banner when an agent is armed", () => {
  const { lastFrame, unmount } = render(<Fleet state={seeded()} cursor={0} armedCancel="ops" />);
  expect(lastFrame() ?? "").toContain("press c again to cancel ops");
  unmount();
});

it("shows cancelled status distinctly for a cancelled agent", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "coder", name: "coder", task: "t", status: "running" } });
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "ops", name: "ops", task: "t", status: "cancelled" } });
  const { lastFrame, unmount } = render(<Fleet state={s} cursor={0} armedCancel={null} />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("cancelled");
  unmount();
});

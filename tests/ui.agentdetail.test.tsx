import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { reduce, emptyState } from "../src/model/store.js";
import { AgentDetail } from "../src/ui/AgentDetail.js";

const seeded = () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "coder", name: "coder", task: "t", status: "running", step: { index: 2 }, cost: 0.03 } });
  s = reduce(s, { type: "runUpdated", agentId: "coder", context: [{ kind: "reasoning", text: "Scanning the signup handler for validation gaps." }] });
  s = reduce(s, { type: "approvalRequested", approval: { id: "coder-1", agentId: "coder", createdAt: 1, action: { kind: "command", command: "npm test", cwd: "." }, context: [{ kind: "reasoning", text: "Run the suite." }] } });
  return s;
};

it("renders the agent header, the live transcript and the focused approval", () => {
  const { lastFrame, unmount } = render(
    <AgentDetail state={seeded()} agentId="coder" cursor={0} steerText={null} armed={false} focusedAction={0} />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("coder");
  expect(frame).toContain("command");
  expect(frame).toContain("Scanning the signup handler");
  expect(frame).toContain("$ npm test");
  unmount();
});

it("shows the position indicator X/N in the header when approvals are pending", () => {
  const { lastFrame, unmount } = render(
    <AgentDetail state={seeded()} agentId="coder" cursor={0} steerText={null} armed={false} focusedAction={0} />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("1/1");
  unmount();
});

it("renders the action bar with button labels", () => {
  const { lastFrame, unmount } = render(
    <AgentDetail state={seeded()} agentId="coder" cursor={0} steerText={null} armed={false} focusedAction={0} />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("Approve");
  expect(frame).not.toContain("┃");
  expect(frame).not.toContain("┏");
  expect(frame).not.toContain("▖");
  expect(frame).toContain("Edit");
  expect(frame).toContain("Deny");
  expect(frame).toContain("Steer");
  expect(frame).toContain("Cancel");
  unmount();
});

it("shows the steer composer when a steer buffer is active", () => {
  const { lastFrame, unmount } = render(
    <AgentDetail state={seeded()} agentId="coder" cursor={0} steerText="focus on login" armed={false} focusedAction={0} />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("steer>");
  expect(frame).toContain("focus on login");
  unmount();
});

it("shows the armed-cancel banner when armed", () => {
  const { lastFrame, unmount } = render(
    <AgentDetail state={seeded()} agentId="coder" cursor={0} steerText={null} armed={true} focusedAction={0} />,
  );
  expect(lastFrame() ?? "").toContain("press Enter again to cancel coder");
  unmount();
});

it("renders a no-pending notice when the agent has no pending approvals", () => {
  let s = emptyState();
  s = reduce(s, { type: "agentStatusChanged", agent: { id: "coder", name: "coder", task: "t", status: "running" } });
  const { lastFrame, unmount } = render(
    <AgentDetail state={s} agentId="coder" cursor={0} steerText={null} armed={false} focusedAction={0} />,
  );
  expect(lastFrame() ?? "").toContain("No pending approvals.");
  unmount();
});

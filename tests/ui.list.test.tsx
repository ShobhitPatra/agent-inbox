import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { reduce, emptyState, pendingApprovals } from "../src/model/store.js";
import { InboxList } from "../src/ui/InboxList.js";
import { StatusBar } from "../src/ui/StatusBar.js";

const buildState = () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "ag1", name: "demo-agent", task: "validate signup", status: "running" },
  });
  s = reduce(s, {
    type: "approvalRequested",
    approval: {
      id: "ap1",
      agentId: "ag1",
      createdAt: 1,
      action: { kind: "edit", path: "src/signup.ts", hunks: [{ oldString: "a", newString: "b" }] },
      context: [],
    },
  });
  s = reduce(s, {
    type: "approvalRequested",
    approval: {
      id: "ap2",
      agentId: "ag1",
      createdAt: 2,
      action: { kind: "command", command: "npm test", cwd: "." },
      context: [],
    },
  });
  return s;
};

it("InboxList renders both pending rows and places the cursor marker correctly", () => {
  const state = buildState();
  expect(pendingApprovals(state).length).toBe(2);

  const { lastFrame, unmount } = render(<InboxList state={state} cursor={0} />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("edit src/signup.ts");
  expect(frame).toContain("command npm test");
  expect(frame).toContain("❯");
  unmount();

  const { lastFrame: lastFrame2, unmount: unmount2 } = render(<InboxList state={state} cursor={1} />);
  const frame2 = lastFrame2() ?? "";
  const lines = frame2.split("\n");
  const cursorLine = lines.findIndex((l) => l.includes("❯"));
  const commandLine = lines.findIndex((l) => l.includes("command npm test"));
  expect(cursorLine).toBe(commandLine);
  unmount2();
});

it("InboxList shows the working indicator when no approvals are pending and an agent is running", () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "ag1", name: "demo-agent", task: "validate signup", status: "running" },
  });

  const { lastFrame, unmount } = render(<InboxList state={s} cursor={0} />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("working");
  unmount();
});

it("StatusBar renders pending count and agent count correctly", () => {
  const state = buildState();

  const { lastFrame, unmount } = render(<StatusBar state={state} />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("2 pending");
  expect(frame).toContain("1 agent");
  unmount();
});

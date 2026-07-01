import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { ApprovalDetail } from "../src/ui/ApprovalDetail.js";
import { RunContext } from "../src/ui/RunContext.js";
import type { Approval } from "../src/model/types.js";

const editApproval: Approval = {
  id: "ap1",
  agentId: "ag1",
  createdAt: 1,
  action: {
    kind: "edit",
    path: "src/signup.ts",
    hunks: [{ oldString: "const body = req.body;", newString: "const body = signupSchema.parse(req.body);" }],
  },
  context: [{ kind: "reasoning", text: "Add zod validation to the signup body before use." }],
};

const commandApproval: Approval = {
  id: "ap2",
  agentId: "ag1",
  createdAt: 2,
  action: { kind: "command", command: "npm test", cwd: "." },
  context: [{ kind: "reasoning", text: "Run the test suite." }],
};

const sendApproval: Approval = {
  id: "ap3",
  agentId: "ag1",
  createdAt: 3,
  action: { kind: "send", target: "github:pr", summary: "Open PR: validate signup body" },
  context: [],
};

it("ApprovalDetail edit: contains agent name, reasoning text, and diff new-line content", () => {
  const { lastFrame, unmount } = render(
    <ApprovalDetail approval={editApproval} agentName="demo-agent" />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("demo-agent");
  expect(frame).toContain("Add zod validation");
  expect(frame).toContain("signupSchema.parse");
  unmount();
});

it("ApprovalDetail command: contains the command, and editedCommand when passed", () => {
  const { lastFrame, unmount } = render(
    <ApprovalDetail approval={commandApproval} agentName="demo-agent" />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("$ npm test");
  unmount();

  const { lastFrame: lastFrame2, unmount: unmount2 } = render(
    <ApprovalDetail approval={commandApproval} agentName="demo-agent" editedCommand="npm test --watch" />,
  );
  const frame2 = lastFrame2() ?? "";
  expect(frame2).toContain("$ npm test --watch");
  unmount2();
});

it("ApprovalDetail send: contains the target and summary", () => {
  const { lastFrame, unmount } = render(
    <ApprovalDetail approval={sendApproval} agentName="demo-agent" />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("github:pr");
  expect(frame).toContain("Open PR: validate signup body");
  unmount();
});

it("ApprovalDetail does not render a key-hint footer", () => {
  const { lastFrame, unmount } = render(
    <ApprovalDetail approval={editApproval} agentName="demo-agent" />,
  );
  expect(lastFrame() ?? "").not.toContain("esc back");
  unmount();
});

it("RunContext tool part: frame contains the tool name", () => {
  const { lastFrame, unmount } = render(
    <RunContext
      context={[
        { kind: "tool", toolName: "read_file", argsText: '{"path":"src/index.ts"}', result: "file contents" },
      ]}
    />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("read_file");
  unmount();
});

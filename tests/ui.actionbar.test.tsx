import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { ActionBar } from "../src/ui/ActionBar.js";

it("renders the focused button as a pill without box or shadow chars", () => {
  const { lastFrame, unmount } = render(
    <ActionBar
      actions={["approve", "deny", "steer", "cancel"]}
      focusedIndex={0}
      armed={false}
      agentName="coder"
    />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("Approve");
  expect(frame).not.toContain("┏");
  expect(frame).not.toContain("┃");
  expect(frame).not.toContain("┗");
  expect(frame).not.toContain("▖");
  expect(frame).not.toContain("▗");
  expect(frame).not.toContain("▸[");
  unmount();
});

it("second button is highlighted when focusedIndex=1", () => {
  const { lastFrame, unmount } = render(
    <ActionBar
      actions={["approve", "deny", "steer", "cancel"]}
      focusedIndex={1}
      armed={false}
      agentName="coder"
    />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("Deny");
  expect(frame).toContain("Approve");
  expect(frame).not.toContain("┃");
  expect(frame).not.toContain("▸[");
  unmount();
});

it("shows Edit button only when actions include edit", () => {
  const { lastFrame, unmount } = render(
    <ActionBar
      actions={["approve", "edit", "deny", "steer", "cancel"]}
      focusedIndex={0}
      armed={false}
      agentName="coder"
    />,
  );
  expect(lastFrame() ?? "").toContain("Edit");
  unmount();

  const { lastFrame: lf2, unmount: u2 } = render(
    <ActionBar
      actions={["approve", "deny", "steer", "cancel"]}
      focusedIndex={0}
      armed={false}
      agentName="coder"
    />,
  );
  expect(lf2() ?? "").not.toContain("Edit");
  u2();
});

it("shows the armed confirm line when armed is true", () => {
  const { lastFrame, unmount } = render(
    <ActionBar
      actions={["approve", "deny", "steer", "cancel"]}
      focusedIndex={3}
      armed={true}
      agentName="coder"
    />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("press Enter again to cancel coder");
  unmount();
});

it("renders the key hint line with arrow indicators and up/down item nav", () => {
  const { lastFrame, unmount } = render(
    <ActionBar
      actions={["approve", "deny", "steer", "cancel"]}
      focusedIndex={0}
      armed={false}
      agentName="coder"
    />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("←");
  expect(frame).toContain("→");
  expect(frame).toContain("↑");
  expect(frame).toContain("↓");
  expect(frame).toContain("item");
  expect(frame).toContain("esc");
  expect(frame).toContain("back");
  unmount();
});

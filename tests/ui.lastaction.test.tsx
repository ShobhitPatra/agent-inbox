import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { LastAction } from "../src/ui/LastAction.js";

it("renders nothing when lastAction is null", () => {
  const { lastFrame, unmount } = render(<LastAction lastAction={null} />);
  expect((lastFrame() ?? "").trim()).toBe("");
  unmount();
});

it("renders approved · label for approved verb without symbol", () => {
  const { lastFrame, unmount } = render(<LastAction lastAction={{ verb: "approved", label: "npm test" }} />);
  const frame = lastFrame() ?? "";
  expect(frame).not.toContain("✓");
  expect(frame).toContain("approved");
  expect(frame).toContain("npm test");
  expect(frame).toContain("·");
  unmount();
});

it("renders denied · label for denied verb without symbol", () => {
  const { lastFrame, unmount } = render(<LastAction lastAction={{ verb: "denied", label: "rm -rf /" }} />);
  const frame = lastFrame() ?? "";
  expect(frame).not.toContain("✗");
  expect(frame).toContain("denied");
  expect(frame).toContain("rm -rf /");
  expect(frame).toContain("·");
  unmount();
});

it("renders steered · label for steered verb without symbol", () => {
  const { lastFrame, unmount } = render(<LastAction lastAction={{ verb: "steered", label: "my-agent" }} />);
  const frame = lastFrame() ?? "";
  expect(frame).not.toContain("↪");
  expect(frame).toContain("steered");
  expect(frame).toContain("my-agent");
  expect(frame).toContain("·");
  unmount();
});

it("renders cancelled · label for cancelled verb without symbol", () => {
  const { lastFrame, unmount } = render(<LastAction lastAction={{ verb: "cancelled", label: "my-agent" }} />);
  const frame = lastFrame() ?? "";
  expect(frame).not.toContain("⊘");
  expect(frame).toContain("cancelled");
  expect(frame).toContain("my-agent");
  expect(frame).toContain("·");
  unmount();
});

it("renders edited · label for edited verb without symbol", () => {
  const { lastFrame, unmount } = render(<LastAction lastAction={{ verb: "edited", label: "echo hello" }} />);
  const frame = lastFrame() ?? "";
  expect(frame).not.toContain("✎");
  expect(frame).toContain("edited");
  expect(frame).toContain("echo hello");
  expect(frame).toContain("·");
  unmount();
});

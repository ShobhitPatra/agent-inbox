import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { KeyHint, KeyHints } from "../src/ui/KeyHint.js";

it("KeyHint renders key label and action text", () => {
  const { lastFrame, unmount } = render(<KeyHint keyLabel="enter" action="open" />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("enter");
  expect(frame).toContain("open");
  unmount();
});

it("KeyHints renders all hints with dot dividers between entries", () => {
  const { lastFrame, unmount } = render(
    <KeyHints
      hints={[
        { keyLabel: "enter", action: "open" },
        { keyLabel: "q", action: "quit" },
      ]}
    />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("enter");
  expect(frame).toContain("open");
  expect(frame).toContain("q");
  expect(frame).toContain("quit");
  expect(frame).toContain("·");
  unmount();
});

it("KeyHints with a single hint renders no divider", () => {
  const { lastFrame, unmount } = render(
    <KeyHints hints={[{ keyLabel: "esc", action: "back" }]} />,
  );
  const frame = lastFrame() ?? "";
  expect(frame).toContain("esc");
  expect(frame).toContain("back");
  expect(frame).not.toContain("·");
  unmount();
});

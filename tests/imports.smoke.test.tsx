import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import { DiffView, ToolCallPrimitive } from "@assistant-ui/react-ink";
import { MarkdownText } from "@assistant-ui/react-ink-markdown";
import { App } from "../src/app.js";

it("local-linked react-ink primitives are importable", () => {
  expect(DiffView).toBeTypeOf("function");
  expect(ToolCallPrimitive.Fallback).toBeTypeOf("function");
  expect(MarkdownText).toBeTypeOf("function");
});

it("the app shell mounts and renders its title", () => {
  const { lastFrame, unmount } = render(<App />);
  expect(lastFrame()).toContain("agent-inbox");
  unmount();
});

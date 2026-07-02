import { it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { Help } from "../src/ui/Help.js";
import { App } from "../src/app.js";
import { createSimulatedSource } from "../src/source/simulated.js";

it("Help renders section headings and title", () => {
  const { lastFrame, unmount } = render(<Help />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("Keybindings");
  expect(frame).toContain("Global");
  expect(frame).toContain("Fleet");
  expect(frame).toContain("Inbox");
  expect(frame).toContain("Agent");
  expect(frame).toContain("Staging");
  unmount();
});

it("Help renders real key entries", () => {
  const { lastFrame, unmount } = render(<Help />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("fleet");
  expect(frame).toContain("quit");
  expect(frame).toContain("toggle");
  unmount();
});

it("Help renders close hint in footer", () => {
  const { lastFrame, unmount } = render(<Help />);
  const frame = lastFrame() ?? "";
  expect(frame).toContain("esc to close");
  unmount();
});

it("pressing ? toggles help overlay on", async () => {
  const source = createSimulatedSource({ stepMs: 0 });
  const { lastFrame, stdin, unmount } = render(<App source={source} />);
  await vi.waitFor(() => expect(lastFrame()).toContain("agent-inbox"), { timeout: 3000 });

  stdin.write("?");
  await vi.waitFor(() => expect(lastFrame()).toContain("Keybindings"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("pressing ? twice toggles help overlay off", async () => {
  const source = createSimulatedSource({ stepMs: 0 });
  const { lastFrame, stdin, unmount } = render(<App source={source} />);
  await vi.waitFor(() => expect(lastFrame()).toContain("agent-inbox"), { timeout: 3000 });

  stdin.write("?");
  await vi.waitFor(() => expect(lastFrame()).toContain("Keybindings"), { timeout: 1000 });

  stdin.write("?");
  await vi.waitFor(() => expect(lastFrame()).not.toContain("Keybindings"), { timeout: 1000 });

  unmount();
  source.dispose();
});

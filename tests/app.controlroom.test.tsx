import { it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { App } from "../src/app.js";
import { createFleetSource } from "../src/source/composite.js";
import type { AgentSource } from "../src/source/types.js";
import type { RunEvent } from "../src/model/types.js";

const lineFor = (frame: string, name: string) =>
  frame.split("\n").find((l) => l.includes(name)) ?? "";

it("n=3 fleet storyboard: agents appear, one finishes, one cancels, one is steered", async () => {
  const source = createFleetSource({ stepMs: 0 });
  const { lastFrame, unmount } = render(<App source={source} />);

  await vi.waitFor(
    () => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("coder");
      expect(frame).toContain("refactor");
      expect(frame).toContain("ops");
    },
    { timeout: 3000 },
  );

  source.decide("coder-ap-edit-1", { action: "approve" });
  source.decide("coder-ap-edit-2", { action: "approve" });
  source.decide("coder-ap-edit-3", { action: "approve" });
  await vi.waitFor(() => expect(lineFor(lastFrame() ?? "", "coder")).toContain("1 pending"), { timeout: 3000 });

  source.decide("coder-ap-cmd-1", { action: "approve" });
  await vi.waitFor(
    () => {
      const coderLine = lineFor(lastFrame() ?? "", "coder");
      expect(coderLine).toContain("step 2");
      expect(coderLine).toContain("1 pending");
    },
    { timeout: 3000 },
  );

  source.decide("coder-ap-send-1", { action: "approve" });
  await vi.waitFor(() => expect(lineFor(lastFrame() ?? "", "coder")).toContain("done"), { timeout: 3000 });

  source.cancel("ops");
  await vi.waitFor(
    () => {
      const opsLine = lineFor(lastFrame() ?? "", "ops");
      expect(opsLine).toContain("cancelled");
      expect(opsLine).toContain("0 pending");
    },
    { timeout: 3000 },
  );

  source.steer("refactor", "keep the public API stable");
  await vi.waitFor(() => expect(lineFor(lastFrame() ?? "", "refactor")).toContain("3 pending"), { timeout: 3000 });

  unmount();
  source.dispose();
});

it("steer through the App input path appends the echo to the agent transcript", async () => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => subs.forEach((cb) => cb(e));
  const source: AgentSource = {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: () => {},
    steer: (agentId, text) =>
      emit({ type: "runUpdated", agentId, context: [{ kind: "reasoning", text: `↳ steering: "${text}" — folding into next step` }] }),
    cancel: () => {},
    start: () => emit({ type: "agentStatusChanged", agent: { id: "refactor", name: "refactor", task: "t", status: "waiting" } }),
    stop: () => {},
    dispose: () => {},
  };

  const { lastFrame, stdin, unmount } = render(
    <App source={source} initialMode="agentDetail" initialDetailAgentId="refactor" />,
  );
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("refactor"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("steer>"), { timeout: 1000 });

  stdin.write("keep the public API stable");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("steer> keep the public API stable"), { timeout: 1000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("keep the public API stable"), { timeout: 3000 });

  unmount();
  source.dispose();
});

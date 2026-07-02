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
      expect(coderLine).toContain("step 4");
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

const makeInboxSource = (onDecide?: (id: string) => void): AgentSource => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => subs.forEach((cb) => cb(e));
  return {
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    decide: (id) => {
      onDecide?.(id);
      emit({ type: "approvalResolved", approvalId: id, status: "approved" });
    },
    steer: () => {},
    cancel: () => {},
    start: () => {
      emit({ type: "agentStatusChanged", agent: { id: "bot", name: "bot", task: "t", status: "waiting" } });
      emit({ type: "approvalRequested", approval: { id: "ap-1", agentId: "bot", createdAt: 0, action: { kind: "command", command: "cmd-alpha", cwd: "." }, context: [] } });
      emit({ type: "approvalRequested", approval: { id: "ap-2", agentId: "bot", createdAt: 1, action: { kind: "command", command: "cmd-beta", cwd: "." }, context: [] } });
    },
    stop: () => {},
    dispose: () => {},
  };
};

it("inbox detail: ↓/↑ navigates between pending approvals", async () => {
  const source = makeInboxSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("cmd-alpha"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ cmd-alpha"), { timeout: 1000 });

  stdin.write("\x1B[B");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ cmd-beta"), { timeout: 1000 });

  stdin.write("\x1B[A");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ cmd-alpha"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("inbox detail: approve auto-advances to next pending approval", async () => {
  const source = makeInboxSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("cmd-alpha"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ cmd-alpha"), { timeout: 1000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ cmd-beta"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("inbox detail: approve last pending falls back to list view", async () => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => subs.forEach((cb) => cb(e));
  const source: AgentSource = {
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    decide: (id) => { emit({ type: "approvalResolved", approvalId: id, status: "approved" }); },
    steer: () => {},
    cancel: () => {},
    start: () => {
      emit({ type: "agentStatusChanged", agent: { id: "bot", name: "bot", task: "t", status: "waiting" } });
      emit({ type: "approvalRequested", approval: { id: "ap-only", agentId: "bot", createdAt: 0, action: { kind: "command", command: "solo-cmd", cwd: "." }, context: [] } });
    },
    stop: () => {},
    dispose: () => {},
  };

  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("solo-cmd"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ solo-cmd"), { timeout: 1000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).not.toContain("$ solo-cmd"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("fleet mode renders a Fleet heading", async () => {
  const source = makeInboxSource();
  const { lastFrame, unmount } = render(<App source={source} initialMode="fleet" />);
  await vi.waitFor(() => expect(lastFrame()).toContain("bot"), { timeout: 3000 });
  expect(lastFrame()).toContain("Fleet");
  unmount();
  source.dispose();
});

it("inbox mode renders an Inbox heading", async () => {
  const source = makeInboxSource();
  const { lastFrame, unmount } = render(<App source={source} initialMode="inbox" />);
  await vi.waitFor(() => expect(lastFrame()).toContain("cmd-alpha"), { timeout: 3000 });
  expect(lastFrame()).toContain("Inbox");
  unmount();
  source.dispose();
});

it("esc on inbox list returns to fleet mode", async () => {
  const source = makeInboxSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);
  await vi.waitFor(() => expect(lastFrame()).toContain("cmd-alpha"), { timeout: 3000 });

  stdin.write("\x1B");
  await vi.waitFor(() => expect(lastFrame()).toContain("Fleet"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("inbox detail: last-action line shows approved · target after approve", async () => {
  const source = makeInboxSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("cmd-alpha"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).toContain("$ cmd-alpha"), { timeout: 1000 });

  stdin.write("\r");
  await vi.waitFor(
    () => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("approved");
      expect(frame).toContain("cmd-alpha");
    },
    { timeout: 1000 },
  );

  unmount();
  source.dispose();
});

const makeSteerSource = (steerSpy: (agentId: string, text: string) => void): AgentSource => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => subs.forEach((cb) => cb(e));
  return {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: () => {},
    steer: steerSpy,
    cancel: () => {},
    start: () =>
      emit({ type: "agentStatusChanged", agent: { id: "refactor", name: "refactor", task: "t", status: "waiting" } }),
    stop: () => {},
    dispose: () => {},
  };
};

it("empty steer submit: does not call source.steer and does not set a steered last-action", async () => {
  const steerSpy = vi.fn();
  const source = makeSteerSource(steerSpy);

  const { lastFrame, stdin, unmount } = render(
    <App source={source} initialMode="agentDetail" initialDetailAgentId="refactor" />,
  );
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("refactor"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("steer>"), { timeout: 1000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("steer>"), { timeout: 1000 });

  expect(steerSpy).not.toHaveBeenCalled();
  expect(lastFrame() ?? "").not.toContain("steered");

  unmount();
  source.dispose();
});

it("whitespace-only steer submit: does not call source.steer and does not set a steered last-action", async () => {
  const steerSpy = vi.fn();
  const source = makeSteerSource(steerSpy);

  const { lastFrame, stdin, unmount } = render(
    <App source={source} initialMode="agentDetail" initialDetailAgentId="refactor" />,
  );
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("refactor"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("steer>"), { timeout: 1000 });

  stdin.write("   ");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("steer>"), { timeout: 1000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("steer>"), { timeout: 1000 });

  expect(steerSpy).not.toHaveBeenCalled();
  expect(lastFrame() ?? "").not.toContain("steered");

  unmount();
  source.dispose();
});

const makeTwoAgentSource = (): AgentSource => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => subs.forEach((cb) => cb(e));
  return {
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    decide: () => {},
    steer: () => {},
    cancel: () => {},
    start: () => {
      emit({ type: "agentStatusChanged", agent: { id: "alpha", name: "alpha-bot", task: "t", status: "running" } });
      emit({ type: "agentStatusChanged", agent: { id: "beta", name: "beta-bot", task: "t", status: "waiting" } });
      emit({ type: "approvalRequested", approval: { id: "ap-alpha", agentId: "alpha", createdAt: 1, action: { kind: "command", command: "alpha-cmd", cwd: "." }, context: [] } });
      emit({ type: "approvalRequested", approval: { id: "ap-beta", agentId: "beta", createdAt: 2, action: { kind: "command", command: "beta-cmd", cwd: "." }, context: [] } });
    },
    stop: () => {},
    dispose: () => {},
  };
};

it("/ opens filter input in fleet mode", async () => {
  const source = makeTwoAgentSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="fleet" />);
  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-bot");
    expect(f).toContain("beta-bot");
  }, { timeout: 3000 });

  stdin.write("/");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter>"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("typing in the filter input shows the query in fleet mode", async () => {
  const source = makeTwoAgentSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="fleet" />);
  await vi.waitFor(() => expect(lastFrame()).toContain("alpha-bot"), { timeout: 3000 });

  stdin.write("/");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter>"), { timeout: 1000 });

  stdin.write("alp");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter> alp"), { timeout: 1000 });

  unmount();
  source.dispose();
});

it("enter applies fleet filter: matching agent visible, non-matching hidden", async () => {
  const source = makeTwoAgentSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="fleet" />);
  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-bot");
    expect(f).toContain("beta-bot");
  }, { timeout: 3000 });

  stdin.write("/");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter>"), { timeout: 1000 });

  stdin.write("alpha");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter> alpha"), { timeout: 1000 });

  stdin.write("\r");

  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-bot");
    expect(f).not.toContain("beta-bot");
  }, { timeout: 1000 });

  unmount();
  source.dispose();
});

it("esc clears applied fleet filter: both agents visible again", async () => {
  const source = makeTwoAgentSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="fleet" />);
  await vi.waitFor(() => expect(lastFrame()).toContain("alpha-bot"), { timeout: 3000 });

  stdin.write("/");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter>"), { timeout: 1000 });
  stdin.write("alpha");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter> alpha"), { timeout: 1000 });
  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame()).not.toContain("beta-bot"), { timeout: 1000 });

  stdin.write("\x1B");
  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-bot");
    expect(f).toContain("beta-bot");
  }, { timeout: 1000 });

  unmount();
  source.dispose();
});

it("/ opens filter input in inbox mode and enter filters approvals", async () => {
  const source = makeTwoAgentSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);
  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-cmd");
    expect(f).toContain("beta-cmd");
  }, { timeout: 3000 });

  stdin.write("/");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter>"), { timeout: 1000 });

  stdin.write("alpha");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter> alpha"), { timeout: 1000 });

  stdin.write("\r");

  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-cmd");
    expect(f).not.toContain("beta-cmd");
  }, { timeout: 1000 });

  unmount();
  source.dispose();
});

it("esc cancels the filter input without applying it", async () => {
  const source = makeTwoAgentSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="fleet" />);
  await vi.waitFor(() => expect(lastFrame()).toContain("alpha-bot"), { timeout: 3000 });

  stdin.write("/");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter>"), { timeout: 1000 });
  stdin.write("alpha");
  await vi.waitFor(() => expect(lastFrame()).toContain("filter> alpha"), { timeout: 1000 });

  stdin.write("\x1B");
  await vi.waitFor(() => {
    const f = lastFrame() ?? "";
    expect(f).toContain("alpha-bot");
    expect(f).toContain("beta-bot");
    expect(f).not.toContain("filter>");
  }, { timeout: 1000 });

  unmount();
  source.dispose();
});

it("steer submit no-ops when agent is not yet registered in state", async () => {
  const steerSpy = vi.fn();
  const subs = new Set<(e: RunEvent) => void>();
  const source: AgentSource = {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: () => {},
    steer: steerSpy,
    cancel: () => {},
    start: () => {},
    stop: () => {},
    dispose: () => {},
  };

  const { lastFrame, stdin, unmount } = render(
    <App source={source} initialMode="agentDetail" initialDetailAgentId="ghost" />,
  );

  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("ghost"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("steer>"), { timeout: 1000 });

  stdin.write("steer attempt on unregistered agent");
  await vi.waitFor(
    () => expect(lastFrame() ?? "").toContain("steer> steer attempt on unregistered agent"),
    { timeout: 1000 },
  );

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("steer>"), { timeout: 1000 });

  expect(steerSpy).not.toHaveBeenCalled();
  expect(lastFrame() ?? "").not.toContain("steered");

  unmount();
  source.dispose();
});

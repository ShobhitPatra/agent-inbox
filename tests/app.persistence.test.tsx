import { it, expect, vi, afterEach } from "vitest";
import { writeFileSync, existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { render } from "ink-testing-library";
import { App } from "../src/app.js";
import { reduce, emptyState } from "../src/model/store.js";
import type { AgentSource } from "../src/source/types.js";
import type { RunEvent } from "../src/model/types.js";

let _hydrationTmpPath: string | null = null;

afterEach(() => {
  vi.unstubAllEnvs();
  if (_hydrationTmpPath && existsSync(_hydrationTmpPath)) {
    unlinkSync(_hydrationTmpPath);
    _hydrationTmpPath = null;
  }
});

const makeIdleSource = (): AgentSource => {
  const subs = new Set<(e: RunEvent) => void>();
  return {
    subscribe: (cb) => { subs.add(cb); return () => subs.delete(cb); },
    decide: () => {},
    steer: () => {},
    cancel: () => {},
    start: () => {},
    stop: () => {},
    dispose: () => {},
  };
};

it("App hydrates from initialState prop and renders pre-loaded agents in fleet mode", async () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "seed-agent", name: "seed-agent", task: "seeded task", status: "running" },
  });

  const source = makeIdleSource();
  const { lastFrame, unmount } = render(<App source={source} initialState={s} initialMode="fleet" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("seed-agent"), { timeout: 3000 });

  unmount();
  source.dispose();
});

it("App hydrates from initialState prop and renders pre-loaded pending approvals in inbox mode", async () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "seed-agent", name: "seed-agent", task: "seeded task", status: "running" },
  });
  s = reduce(s, {
    type: "approvalRequested",
    approval: {
      id: "seed-ap1",
      agentId: "seed-agent",
      createdAt: 1,
      action: { kind: "command", command: "seed-cmd", cwd: "." },
      context: [],
    },
  });

  const source = makeIdleSource();
  const { lastFrame, unmount } = render(<App source={source} initialState={s} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("seed-cmd"), { timeout: 3000 });

  unmount();
  source.dispose();
});

it("App hydrates from disk via env when no initialState prop is provided", async () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "disk-agent", name: "disk-agent", task: "disk task", status: "running" },
  });
  s = reduce(s, {
    type: "approvalRequested",
    approval: {
      id: "disk-ap1",
      agentId: "disk-agent",
      createdAt: 1,
      action: { kind: "command", command: "disk-cmd", cwd: "." },
      context: [],
    },
  });

  _hydrationTmpPath = join(tmpdir(), `agent-inbox-hydration-${process.pid}-${Date.now()}.json`);
  writeFileSync(_hydrationTmpPath, JSON.stringify(s));

  vi.stubEnv("AGENT_INBOX_PERSIST", "1");
  vi.stubEnv("AGENT_INBOX_STATE_PATH", _hydrationTmpPath);

  const source = makeIdleSource();
  const { lastFrame, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame()).toContain("disk-cmd"), { timeout: 3000 });

  unmount();
  source.dispose();
});

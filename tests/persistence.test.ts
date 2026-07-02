import { it, expect, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reduce, emptyState } from "../src/model/store.js";
import { saveState, loadState, persistEnabled, statePath } from "../src/persistence.js";

const tmpBase = join(tmpdir(), `agent-inbox-persist-test-${process.pid}`);
const uniquePath = (suffix: string) => join(tmpBase, `${Date.now()}-${suffix}.json`);

afterEach(() => {
  if (existsSync(tmpBase)) rmSync(tmpBase, { recursive: true, force: true });
});

it("saveState then loadState round-trips the full inbox state", () => {
  let s = emptyState();
  s = reduce(s, {
    type: "agentStatusChanged",
    agent: { id: "a1", name: "alpha", task: "do stuff", status: "running" },
  });
  s = reduce(s, {
    type: "approvalRequested",
    approval: {
      id: "ap1",
      agentId: "a1",
      createdAt: 42,
      action: { kind: "command", command: "ls", cwd: "/tmp" },
      context: [],
    },
  });

  const path = uniquePath("roundtrip");
  saveState(s, path);
  const loaded = loadState(path);

  expect(loaded).toEqual(s);
});

it("loadState returns null for a missing path", () => {
  const path = uniquePath("missing");
  const result = loadState(path);
  expect(result).toBeNull();
});

it("loadState returns null for a corrupt JSON file", () => {
  mkdirSync(tmpBase, { recursive: true });
  const path = uniquePath("corrupt");
  writeFileSync(path, "{ not valid json ]]]");
  const result = loadState(path);
  expect(result).toBeNull();
});

it("loadState returns null for valid JSON with wrong shape (array)", () => {
  mkdirSync(tmpBase, { recursive: true });
  const path = uniquePath("wrong-shape-array");
  writeFileSync(path, "[]");
  expect(loadState(path)).toBeNull();
});

it("loadState returns null for valid JSON with wrong shape (object missing required fields)", () => {
  mkdirSync(tmpBase, { recursive: true });
  const path = uniquePath("wrong-shape-obj");
  writeFileSync(path, JSON.stringify({ order: "x" }));
  expect(loadState(path)).toBeNull();
});

it("persistEnabled returns false when AGENT_INBOX_PERSIST is absent", () => {
  expect(persistEnabled({})).toBe(false);
});

it("persistEnabled returns false when AGENT_INBOX_PERSIST is an empty string", () => {
  expect(persistEnabled({ AGENT_INBOX_PERSIST: "" })).toBe(false);
});

it("persistEnabled returns true when AGENT_INBOX_PERSIST is set to a non-empty string", () => {
  expect(persistEnabled({ AGENT_INBOX_PERSIST: "1" })).toBe(true);
  expect(persistEnabled({ AGENT_INBOX_PERSIST: "true" })).toBe(true);
});

it("statePath returns the default path when AGENT_INBOX_STATE_PATH is not set", () => {
  expect(statePath({})).toBe(".agent-inbox/state.json");
});

it("statePath returns the custom path when AGENT_INBOX_STATE_PATH is set", () => {
  const custom = "/my/custom/state.json";
  expect(statePath({ AGENT_INBOX_STATE_PATH: custom })).toBe(custom);
});

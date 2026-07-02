import { it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import React from "react";
import { App } from "../src/app.js";
import type { AgentSource, Decision } from "../src/source/types.js";
import type { RunEvent } from "../src/model/types.js";

const twoHunkEdit = {
  kind: "edit" as const,
  path: "src/foo.ts",
  hunks: [
    { oldString: "alpha\n", newString: "ALPHA\n" },
    { oldString: "beta\n", newString: "BETA\n" },
  ],
};

const threeHunkEdit = {
  kind: "edit" as const,
  path: "src/lib/validators.ts",
  hunks: [
    { oldString: "// signupSchema", newString: "export const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8) });" },
    { oldString: "// loginSchema", newString: "export const loginSchema = z.object({ email: z.string().email(), password: z.string() });" },
    { oldString: "// resetSchema", newString: "export const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) });" },
  ],
};

const singleHunkEdit = {
  kind: "edit" as const,
  path: "src/one.ts",
  hunks: [{ oldString: "original", newString: "replacement" }],
};

type EditLike = { kind: "edit"; path: string; hunks: { oldString: string; newString: string }[] };

const makeEditSource = (onDecide?: (id: string, d: Decision) => void, action: EditLike = twoHunkEdit): AgentSource => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => subs.forEach((cb) => cb(e));
  return {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: (id, decision) => {
      onDecide?.(id, decision);
      emit({ type: "approvalResolved", approvalId: id, status: "approved" });
    },
    steer: () => {},
    cancel: () => {},
    start: () => {
      emit({ type: "agentStatusChanged", agent: { id: "bot", name: "bot", task: "t", status: "waiting" } });
      emit({
        type: "approvalRequested",
        approval: { id: "ap-edit", agentId: "bot", createdAt: 0, action, context: [] },
      });
    },
    stop: () => {},
    dispose: () => {},
  };
};

it("edit approval exposes a Stage action in the action bar", async () => {
  const source = makeEditSource();
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("src/foo.ts"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Stage"), { timeout: 3000 });

  unmount();
  source.dispose();
});

it("entering staging shows the hunk key hints and Approve sends only the staged subset", { retry: 3 }, async () => {
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const decide = vi.fn();
  const source = makeEditSource(decide);
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("src/foo.ts"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Stage"), { timeout: 3000 });

  stdin.write("\x1B[C");
  await tick();
  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("toggle"), { timeout: 3000 });

  stdin.write(" ");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("[ ]"), { timeout: 3000 });

  stdin.write("\x1B");
  await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("toggle"), { timeout: 3000 });

  stdin.write("\x1B[D");
  await tick();
  stdin.write("\r");

  await vi.waitFor(() => expect(decide).toHaveBeenCalled(), { timeout: 3000 });

  const [id, decision] = decide.mock.calls[0]!;
  expect(id).toBe("ap-edit");
  expect(decision.action).toBe("edit");
  expect(decision.editedAction.hunks).toEqual([twoHunkEdit.hunks[1]]);

  unmount();
  source.dispose();
});

it("staging a three-hunk edit and deselecting hunk 0 sends the two-hunk subset to decide", { retry: 3 }, async () => {
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const decide = vi.fn();
  const source = makeEditSource(decide, threeHunkEdit);
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("src/lib/validators.ts"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Stage"), { timeout: 3000 });

  stdin.write("\x1B[C");
  await tick();
  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("toggle"), { timeout: 3000 });

  stdin.write(" ");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("[ ]"), { timeout: 3000 });

  stdin.write("\x1B");
  await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("toggle"), { timeout: 3000 });

  stdin.write("\x1B[D");
  await tick();
  stdin.write("\r");

  await vi.waitFor(() => expect(decide).toHaveBeenCalled(), { timeout: 3000 });

  const [id, decision] = decide.mock.calls[0]!;
  expect(id).toBe("ap-edit");
  expect(decision.action).toBe("edit");
  expect(decision.editedAction.hunks).toHaveLength(2);
  expect(decision.editedAction.hunks).toEqual([threeHunkEdit.hunks[1], threeHunkEdit.hunks[2]]);

  unmount();
  source.dispose();
});

it("deselecting all hunks then esc resets staged so Approve sends a full approve", async () => {
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const decide = vi.fn();
  const source = makeEditSource(decide, singleHunkEdit);
  const { lastFrame, stdin, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("src/one.ts"), { timeout: 3000 });

  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("Stage"), { timeout: 3000 });

  stdin.write("\x1B[C");
  await tick();
  stdin.write("\r");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("toggle"), { timeout: 3000 });

  stdin.write(" ");
  await vi.waitFor(() => expect(lastFrame() ?? "").toContain("[ ]"), { timeout: 3000 });

  stdin.write("\x1B");
  await vi.waitFor(() => expect(lastFrame() ?? "").not.toContain("toggle"), { timeout: 3000 });

  stdin.write("\x1B[D");
  await tick();
  stdin.write("\r");

  await vi.waitFor(() => expect(decide).toHaveBeenCalled(), { timeout: 3000 });

  const [id, decision] = decide.mock.calls[0]!;
  expect(id).toBe("ap-edit");
  expect(decision.action).toBe("approve");

  unmount();
  source.dispose();
});

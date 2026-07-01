import { it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "../src/app.js";
import { createSimulatedSource } from "../src/source/simulated.js";

it("mounts the shell without throwing", async () => {
  const source = createSimulatedSource({ stepMs: 0 });
  const { lastFrame, unmount } = render(<App source={source} />);
  await vi.waitFor(() => expect(lastFrame()).toContain("agent-inbox"), { timeout: 3000 });
  unmount();
});

it("full storyboard end-to-end through App", async () => {
  const source = createSimulatedSource({ stepMs: 0 });
  const { lastFrame, unmount } = render(<App source={source} initialMode="inbox" />);

  await vi.waitFor(
    () => expect(lastFrame()).toContain("3 pending"),
    { timeout: 3000 },
  );
  expect(lastFrame()).toContain("signup.ts");

  source.decide("ap-edit-1", { action: "approve" });
  source.decide("ap-edit-2", { action: "deny" });
  source.decide("ap-edit-3", { action: "approve" });

  await vi.waitFor(
    () => expect(lastFrame()).toContain("command npm test"),
    { timeout: 3000 },
  );
  expect(lastFrame()).toContain("1 pending");

  source.decide("ap-cmd-1", {
    action: "edit",
    editedAction: { kind: "command", command: "npm test -- --watch", cwd: "." },
  });

  await vi.waitFor(
    () => expect(lastFrame()).toContain("send github:pr"),
    { timeout: 3000 },
  );
  expect(lastFrame()).toContain("1 pending");

  source.decide("ap-send-1", { action: "approve" });

  await vi.waitFor(
    () => {
      const frame = lastFrame() ?? "";
      expect(frame).toContain("0 pending");
      expect(frame).not.toContain("working");
    },
    { timeout: 3000 },
  );

  unmount();
  source.dispose();
});

it("keybinding wiring: stdin write does not crash the app", async () => {
  const source = createSimulatedSource({ stepMs: 0 });
  const { lastFrame, stdin, unmount } = render(<App source={source} />);
  await vi.waitFor(() => expect(lastFrame()).toContain("agent-inbox"), { timeout: 3000 });
  try {
    stdin.write("j");
  } catch {
  }
  expect(lastFrame()).toContain("agent-inbox");
  unmount();
  source.dispose();
});

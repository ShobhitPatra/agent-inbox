import { it, expect } from "vitest";
import { render } from "ink-testing-library";
import { DiffView } from "@assistant-ui/react-ink";
import { editToPatch } from "../src/model/diff.js";
import type { Action } from "../src/model/types.js";

const makeEdit = (
  path: string,
  oldString: string,
  newString: string,
): Extract<Action, { kind: "edit" }> => ({
  kind: "edit",
  path,
  hunks: [{ oldString, newString }],
});

it("patch string contains --- +++ @@ headers and +/- lines", () => {
  const patch = editToPatch(makeEdit("src/foo.ts", "const x = 1;\n", "const x = 2;\n"));
  expect(patch).toContain("--- a/src/foo.ts");
  expect(patch).toContain("+++ b/src/foo.ts");
  expect(patch).toMatch(/@@ .* @@/);
  expect(patch).toContain("-const x = 1;");
  expect(patch).toContain("+const x = 2;");
});

it("renders through DiffView and shows the new line text", () => {
  const patch = editToPatch(makeEdit("src/foo.ts", "const x = 1;\n", "const x = 2;\n"));
  const { lastFrame, unmount } = render(<DiffView patch={patch} />);
  expect(lastFrame()).toContain("const x = 2;");
  unmount();
});

it("emits one @@ header per hunk for multi-hunk edits", () => {
  const action: Extract<Action, { kind: "edit" }> = {
    kind: "edit",
    path: "lib/util.ts",
    hunks: [
      { oldString: "alpha\n", newString: "ALPHA\n" },
      { oldString: "beta\n", newString: "BETA\n" },
    ],
  };
  const patch = editToPatch(action);
  const headerCount = (patch.match(/^@@/gm) ?? []).length;
  expect(headerCount).toBe(2);
});

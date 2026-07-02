import { it, expect } from "vitest";
import type { StagedSelection } from "@assistant-ui/react-ink";
import { materializeStaged } from "../src/model/stage.js";
import type { Action } from "../src/model/types.js";

const edit: Extract<Action, { kind: "edit" }> = {
  kind: "edit",
  path: "src/foo.ts",
  hunks: [
    { oldString: "a\n", newString: "A\n" },
    { oldString: "b\n", newString: "B\n" },
    { oldString: "c\n", newString: "C\n" },
  ],
};

it("all hunks staged returns every hunk in order", () => {
  const sel: StagedSelection = {
    stagedHunks: [
      { fileIndex: 0, hunkIndex: 0 },
      { fileIndex: 0, hunkIndex: 1 },
      { fileIndex: 0, hunkIndex: 2 },
    ],
  };
  expect(materializeStaged(sel, edit)).toEqual(edit.hunks);
});

it("a subset returns only the staged hunks in original order", () => {
  const sel: StagedSelection = {
    stagedHunks: [
      { fileIndex: 0, hunkIndex: 2 },
      { fileIndex: 0, hunkIndex: 0 },
    ],
  };
  expect(materializeStaged(sel, edit)).toEqual([edit.hunks[0], edit.hunks[2]]);
});

it("none staged returns an empty array", () => {
  const sel: StagedSelection = { stagedHunks: [] };
  expect(materializeStaged(sel, edit)).toEqual([]);
});

it("ignores hunks that belong to a different file index", () => {
  const sel: StagedSelection = {
    stagedHunks: [
      { fileIndex: 1, hunkIndex: 0 },
      { fileIndex: 0, hunkIndex: 1 },
    ],
  };
  expect(materializeStaged(sel, edit)).toEqual([edit.hunks[1]]);
});

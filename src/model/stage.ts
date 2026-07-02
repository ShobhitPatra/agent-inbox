import type { StagedSelection } from "@assistant-ui/react-ink";
import type { Action } from "./types.js";

type EditAction = Extract<Action, { kind: "edit" }>;

export const materializeStaged = (sel: StagedSelection, action: EditAction): EditAction["hunks"] => {
  const staged = new Set(
    sel.stagedHunks.filter((h) => h.fileIndex === 0).map((h) => h.hunkIndex),
  );
  return action.hunks.filter((_, index) => staged.has(index));
};

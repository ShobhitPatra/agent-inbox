import type { Action } from "./types.js";

const splitLines = (s: string): string[] => {
  const lines = s.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
};

export const editToPatch = (action: Extract<Action, { kind: "edit" }>): string => {
  const { path, hunks } = action;
  const parts: string[] = [`--- a/${path}`, `+++ b/${path}`];
  for (const { oldString, newString } of hunks) {
    const oldLines = splitLines(oldString);
    const newLines = splitLines(newString);
    parts.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
    for (const line of oldLines) parts.push(`-${line}`);
    for (const line of newLines) parts.push(`+${line}`);
  }
  return parts.join("\n") + "\n";
};

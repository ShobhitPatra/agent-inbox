import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { InboxState } from "./model/types.js";

export const persistEnabled = (env: Record<string, string | undefined> = process.env): boolean =>
  Boolean(env["AGENT_INBOX_PERSIST"]);

export const statePath = (env: Record<string, string | undefined> = process.env): string =>
  env["AGENT_INBOX_STATE_PATH"] ?? ".agent-inbox/state.json";

const isInboxState = (v: unknown): v is InboxState => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o["agents"] === "object" && o["agents"] !== null && !Array.isArray(o["agents"]) &&
    typeof o["approvals"] === "object" && o["approvals"] !== null && !Array.isArray(o["approvals"]) &&
    Array.isArray(o["order"]) &&
    typeof o["runs"] === "object" && o["runs"] !== null && !Array.isArray(o["runs"])
  );
};

export const loadState = (path: string = statePath()): InboxState | null => {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return isInboxState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const saveState = (state: InboxState, path: string = statePath()): void => {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(state));
  } catch {
  }
};

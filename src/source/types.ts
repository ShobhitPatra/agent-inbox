import type { RunEvent, Action } from "../model/types.js";

export type Decision = {
  action: "approve" | "deny" | "edit";
  editedAction?: Action;
};

export type AgentSource = {
  subscribe: (cb: (e: RunEvent) => void) => () => void;
  decide: (approvalId: string, decision: Decision) => void;
  steer: (agentId: string, text: string) => void;
  cancel: (agentId: string) => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
};

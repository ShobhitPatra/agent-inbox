export type AgentStatus = "running" | "waiting" | "done" | "error" | "cancelled";
export type Agent = {
  id: string;
  name: string;
  task: string;
  status: AgentStatus;
  step?: { index: number; total?: number };
  cost?: number;
};

export type Action =
  | { kind: "edit"; path: string; hunks: { oldString: string; newString: string }[] }
  | { kind: "command"; command: string; cwd: string }
  | { kind: "send"; target: string; summary: string; amount?: number };

export type ContextPart =
  | { kind: "reasoning"; text: string }
  | { kind: "tool"; toolName: string; argsText: string; result?: string };

export type ApprovalStatus = "pending" | "approved" | "denied";
export type Approval = {
  id: string; agentId: string; createdAt: number;
  action: Action; context: ContextPart[]; status?: ApprovalStatus;
};

export type RunEvent =
  | { type: "agentStatusChanged"; agent: Agent }
  | { type: "runUpdated"; agentId: string; context: ContextPart[] }
  | { type: "approvalRequested"; approval: Approval }
  | { type: "approvalResolved"; approvalId: string; status: ApprovalStatus }
  | { type: "agentFinished"; agentId: string };

export type InboxState = {
  agents: Record<string, Agent>;
  approvals: Record<string, Approval>;
  order: string[];
  runs: Record<string, ContextPart[]>;
};

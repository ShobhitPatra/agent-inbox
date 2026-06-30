import type { InboxState, RunEvent, Approval, Agent } from "./types.js";

export const emptyState = (): InboxState => ({ agents: {}, approvals: {}, order: [] });

export const reduce = (s: InboxState, e: RunEvent): InboxState => {
  switch (e.type) {
    case "agentStatusChanged":
      return { ...s, agents: { ...s.agents, [e.agent.id]: e.agent } };
    case "runUpdated":
      return s;
    case "approvalRequested": {
      const ap: Approval = { ...e.approval, status: e.approval.status ?? "pending" };
      return { ...s, approvals: { ...s.approvals, [ap.id]: ap }, order: [...s.order, ap.id] };
    }
    case "approvalResolved": {
      const ap = s.approvals[e.approvalId];
      if (!ap) return s;
      return { ...s, approvals: { ...s.approvals, [e.approvalId]: { ...ap, status: e.status } } };
    }
    case "agentFinished": {
      const a = s.agents[e.agentId];
      if (!a) return s;
      return { ...s, agents: { ...s.agents, [e.agentId]: { ...a, status: "done" } } };
    }
  }
};

export const pendingApprovals = (s: InboxState): Approval[] =>
  s.order.map((id) => s.approvals[id]!).filter((a) => a.status === "pending");

export const agentById = (s: InboxState, id: string): Agent | undefined => s.agents[id];

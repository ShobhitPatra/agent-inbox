import { useEffect, useReducer, useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { reduce, emptyState, pendingApprovals, fleet, pendingForAgent } from "./model/store.js";
import type { RunEvent } from "./model/types.js";
import type { AgentSource } from "./source/types.js";
import { createFleetSource } from "./source/composite.js";
import { createRealSource } from "./source/real.js";
import { Fleet } from "./ui/Fleet.js";
import { AgentDetail } from "./ui/AgentDetail.js";
import { InboxList } from "./ui/InboxList.js";
import { StatusBar } from "./ui/StatusBar.js";
import { ApprovalDetail } from "./ui/ApprovalDetail.js";

export type Mode = "fleet" | "inbox" | "agentDetail";

export const App = ({
  source: providedSource,
  initialMode = "fleet",
  initialDetailAgentId = null,
}: { source?: AgentSource; initialMode?: Mode; initialDetailAgentId?: string | null } = {}) => {
  const [source] = useState(
    () => providedSource ?? (process.env["AGENT_INBOX_REAL"] ? createRealSource() : createFleetSource()),
  );
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof emptyState>, e: RunEvent) => reduce(s, e),
    undefined,
    emptyState,
  );
  const [mode, setMode] = useState<Mode>(initialMode);
  const [cursor, setCursor] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailAgentId, setDetailAgentId] = useState<string | null>(initialDetailAgentId);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [steerText, setSteerText] = useState<string | null>(null);
  const [armedCancel, setArmedCancel] = useState<string | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    const off = source.subscribe(dispatch);
    source.start();
    return () => {
      off();
      source.dispose();
    };
  }, [source]);

  useEffect(() => {
    if (mode === "inbox" && openId && state.approvals[openId]?.status !== "pending") {
      setOpenId(null);
    }
  }, [mode, openId, state.approvals]);

  const pending = pendingApprovals(state);
  const inboxCursor = Math.min(cursor, Math.max(pending.length - 1, 0));

  useInput((input, key) => {
    const textActive = editing !== null || steerText !== null;

    if (textActive) {
      if (steerText !== null) {
        if (key.return) {
          if (detailAgentId) source.steer(detailAgentId, steerText);
          setSteerText(null);
        } else if (key.backspace || key.delete) {
          setSteerText((t) => (t ?? "").slice(0, -1));
        } else if (input) {
          setSteerText((t) => (t ?? "") + input);
        }
        return;
      }
      if (key.return) {
        const ap = editingId ? state.approvals[editingId] : undefined;
        if (ap && ap.action.kind === "command") {
          source.decide(ap.id, { action: "edit", editedAction: { ...ap.action, command: editing! } });
        }
        setEditing(null);
        setEditingId(null);
        setOpenId(null);
      } else if (key.backspace || key.delete) {
        setEditing((e) => (e ?? "").slice(0, -1));
      } else if (input) {
        setEditing((e) => (e ?? "") + input);
      }
      return;
    }

    if (input === "q") {
      source.dispose();
      exit();
      return;
    }
    if (input === "f") {
      setMode("fleet");
      setCursor(0);
      setArmedCancel(null);
      return;
    }
    if (input === "i") {
      setMode("inbox");
      setCursor(0);
      setOpenId(null);
      setArmedCancel(null);
      return;
    }
    if (key.tab) {
      setMode(mode === "fleet" ? "inbox" : "fleet");
      setCursor(0);
      setOpenId(null);
      setArmedCancel(null);
      return;
    }
    if (key.escape) {
      setArmedCancel(null);
      if (mode === "agentDetail") {
        setMode("fleet");
        setCursor(0);
        setDetailAgentId(null);
      } else if (mode === "inbox" && openId) {
        setOpenId(null);
      }
      return;
    }

    if (mode === "fleet") {
      const agents = fleet(state);
      const focusIndex = Math.min(cursor, Math.max(agents.length - 1, 0));
      if (key.downArrow || input === "j") {
        setCursor(Math.min(focusIndex + 1, Math.max(agents.length - 1, 0)));
        setArmedCancel(null);
      }
      if (key.upArrow || input === "k") {
        setCursor(Math.max(focusIndex - 1, 0));
        setArmedCancel(null);
      }
      if (key.return) {
        const a = agents[focusIndex];
        if (a) {
          setDetailAgentId(a.id);
          setMode("agentDetail");
          setCursor(0);
          setArmedCancel(null);
        }
      }
      if (input === "c") {
        const a = agents[focusIndex];
        if (a) {
          if (armedCancel === a.id) {
            source.cancel(a.id);
            setArmedCancel(null);
          } else {
            setArmedCancel(a.id);
          }
        }
      }
      return;
    }

    if (mode === "inbox") {
      if (!openId) {
        if (key.downArrow || input === "j") setCursor(Math.min(inboxCursor + 1, Math.max(pending.length - 1, 0)));
        if (key.upArrow || input === "k") setCursor(Math.max(inboxCursor - 1, 0));
        if (key.return) {
          const a = pending[inboxCursor];
          if (a) setOpenId(a.id);
        }
        if (input === "a" || input === "d") {
          const a = pending[inboxCursor];
          if (a) source.decide(a.id, { action: input === "a" ? "approve" : "deny" });
        }
        return;
      }
      const open = state.approvals[openId];
      if (!open) return;
      if (input === "a") {
        source.decide(open.id, { action: "approve" });
        setOpenId(null);
      }
      if (input === "d") {
        source.decide(open.id, { action: "deny" });
        setOpenId(null);
      }
      if (input === "e" && open.action.kind === "command") {
        setEditing(open.action.command);
        setEditingId(open.id);
      }
      return;
    }

    if (!detailAgentId) return;
    const agent = state.agents[detailAgentId];
    const detailPending = pendingForAgent(state, detailAgentId);
    const detailCursor = Math.min(cursor, Math.max(detailPending.length - 1, 0));
    if (input === "s" && agent?.status !== "done" && agent?.status !== "cancelled") {
      setSteerText("");
      return;
    }
    if (input === "c") {
      if (armedCancel === detailAgentId) {
        source.cancel(detailAgentId);
        setArmedCancel(null);
      } else {
        setArmedCancel(detailAgentId);
      }
      return;
    }
    if (key.downArrow || input === "j") {
      setCursor(Math.min(detailCursor + 1, Math.max(detailPending.length - 1, 0)));
      setArmedCancel(null);
    }
    if (key.upArrow || input === "k") {
      setCursor(Math.max(detailCursor - 1, 0));
      setArmedCancel(null);
    }
    const focused = detailPending[detailCursor];
    if (input === "a" && focused) source.decide(focused.id, { action: "approve" });
    if (input === "d" && focused) source.decide(focused.id, { action: "deny" });
    if (input === "e" && focused && focused.action.kind === "command") {
      setEditing(focused.action.command);
      setEditingId(focused.id);
    }
  });

  const open = openId ? state.approvals[openId] : undefined;
  const editedCommand = editingId && editing !== null ? editing : undefined;

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold>agent-inbox</Text>
      </Box>
      <StatusBar state={state} />
      <Box marginTop={1}>
        {mode === "fleet" && <Fleet state={state} cursor={cursor} armedCancel={armedCancel} />}
        {mode === "inbox" &&
          (open ? (
            <ApprovalDetail
              approval={open}
              agentName={state.agents[open.agentId]?.name ?? open.agentId}
              editedCommand={editing ?? undefined}
            />
          ) : (
            <InboxList state={state} cursor={inboxCursor} />
          ))}
        {mode === "agentDetail" && detailAgentId && (
          <AgentDetail
            state={state}
            agentId={detailAgentId}
            cursor={cursor}
            steerText={steerText}
            editedCommand={editedCommand}
            armed={armedCancel === detailAgentId}
          />
        )}
      </Box>
    </Box>
  );
};

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
import { ActionBar } from "./ui/ActionBar.js";
import type { ActionKind } from "./ui/ActionBar.js";

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
  const [focusedAction, setFocusedAction] = useState(0);
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
          const targetAgentId = detailAgentId ?? (openId ? state.approvals[openId]?.agentId : null);
          if (targetAgentId) source.steer(targetAgentId, steerText);
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
        setFocusedAction(0);
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
        setFocusedAction(0);
      } else if (mode === "inbox" && openId) {
        setOpenId(null);
        setFocusedAction(0);
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
          setFocusedAction(0);
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
          if (a) {
            setOpenId(a.id);
            setFocusedAction(0);
          }
        }
        if (input === "a" || input === "d") {
          const a = pending[inboxCursor];
          if (a) source.decide(a.id, { action: input === "a" ? "approve" : "deny" });
        }
        return;
      }

      const open = state.approvals[openId];
      if (!open) return;

      const inboxAgentId = open.agentId;
      const inboxAgent = state.agents[inboxAgentId];
      const isActive = inboxAgent?.status !== "done" && inboxAgent?.status !== "cancelled";

      const inboxActions: ActionKind[] = ["approve"];
      if (open.action.kind === "command") inboxActions.push("edit");
      inboxActions.push("deny");
      if (isActive) inboxActions.push("steer", "cancel");

      const focusedActionClamped = Math.min(focusedAction, Math.max(inboxActions.length - 1, 0));

      if (key.leftArrow) {
        setFocusedAction(Math.max(focusedActionClamped - 1, 0));
        setArmedCancel(null);
        return;
      }
      if (key.rightArrow) {
        setFocusedAction(Math.min(focusedActionClamped + 1, Math.max(inboxActions.length - 1, 0)));
        setArmedCancel(null);
        return;
      }
      if (key.return) {
        const action = inboxActions[focusedActionClamped];
        if (action === "approve") {
          source.decide(open.id, { action: "approve" });
          setOpenId(null);
          setFocusedAction(0);
        } else if (action === "deny") {
          source.decide(open.id, { action: "deny" });
          setOpenId(null);
          setFocusedAction(0);
        } else if (action === "edit" && open.action.kind === "command") {
          setEditing(open.action.command);
          setEditingId(open.id);
        } else if (action === "steer") {
          setSteerText("");
        } else if (action === "cancel") {
          if (armedCancel === inboxAgentId) {
            source.cancel(inboxAgentId);
            setArmedCancel(null);
            setOpenId(null);
            setFocusedAction(0);
          } else {
            setArmedCancel(inboxAgentId);
          }
        }
        return;
      }
      return;
    }

    if (!detailAgentId) return;
    const agent = state.agents[detailAgentId];
    const detailPending = pendingForAgent(state, detailAgentId);
    const detailCursor = Math.min(cursor, Math.max(detailPending.length - 1, 0));
    const focused = detailPending[detailCursor];

    const isActive = agent?.status !== "done" && agent?.status !== "cancelled";
    const detailActions: ActionKind[] = [];
    if (focused) {
      detailActions.push("approve");
      if (focused.action.kind === "command") detailActions.push("edit");
      detailActions.push("deny");
    }
    if (isActive) detailActions.push("steer", "cancel");

    const focusedActionClamped = Math.min(focusedAction, Math.max(detailActions.length - 1, 0));

    if (key.leftArrow) {
      setFocusedAction(Math.max(focusedActionClamped - 1, 0));
      setArmedCancel(null);
      return;
    }
    if (key.rightArrow) {
      setFocusedAction(Math.min(focusedActionClamped + 1, Math.max(detailActions.length - 1, 0)));
      setArmedCancel(null);
      return;
    }
    if (key.downArrow || input === "j") {
      setCursor(Math.min(detailCursor + 1, Math.max(detailPending.length - 1, 0)));
      setFocusedAction(0);
      setArmedCancel(null);
      return;
    }
    if (key.upArrow || input === "k") {
      setCursor(Math.max(detailCursor - 1, 0));
      setFocusedAction(0);
      setArmedCancel(null);
      return;
    }
    if (key.return) {
      const action = detailActions[focusedActionClamped];
      if (action === "approve" && focused) {
        source.decide(focused.id, { action: "approve" });
        setFocusedAction(0);
      } else if (action === "deny" && focused) {
        source.decide(focused.id, { action: "deny" });
        setFocusedAction(0);
      } else if (action === "edit" && focused && focused.action.kind === "command") {
        setEditing(focused.action.command);
        setEditingId(focused.id);
      } else if (action === "steer") {
        setSteerText("");
      } else if (action === "cancel") {
        if (armedCancel === detailAgentId) {
          source.cancel(detailAgentId);
          setArmedCancel(null);
        } else {
          setArmedCancel(detailAgentId);
        }
      }
    }
  });

  const open = openId ? state.approvals[openId] : undefined;
  const editedCommand = editingId && editing !== null ? editing : undefined;

  const inboxActions: ActionKind[] = open ? (() => {
    const a: ActionKind[] = ["approve"];
    if (open.action.kind === "command") a.push("edit");
    a.push("deny");
    const inboxAgent = state.agents[open.agentId];
    const isActive = inboxAgent?.status !== "done" && inboxAgent?.status !== "cancelled";
    if (isActive) a.push("steer", "cancel");
    return a;
  })() : [];

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
            <Box flexDirection="column">
              <ApprovalDetail
                approval={open}
                agentName={state.agents[open.agentId]?.name ?? open.agentId}
                editedCommand={editedCommand}
              />
              {steerText !== null ? (
                <Box marginTop={1}>
                  <Text color="cyan">
                    {"steer> "}
                    {steerText}
                  </Text>
                </Box>
              ) : null}
              <ActionBar
                actions={inboxActions}
                focusedIndex={focusedAction}
                armed={armedCancel === open.agentId}
                agentName={state.agents[open.agentId]?.name ?? open.agentId}
              />
            </Box>
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
            focusedAction={focusedAction}
          />
        )}
      </Box>
    </Box>
  );
};

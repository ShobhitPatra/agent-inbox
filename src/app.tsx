import { useEffect, useReducer, useState } from "react";
import { Box, Text, useInput, useApp, useFocusManager } from "ink";
import type { StagedSelection } from "@assistant-ui/react-ink";
import { reduce, emptyState, pendingApprovals, fleet, pendingForAgent } from "./model/store.js";
import { materializeStaged } from "./model/stage.js";
import type { RunEvent, Action, Approval } from "./model/types.js";
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
import { LastAction } from "./ui/LastAction.js";
import type { LastActionState } from "./ui/LastAction.js";
import { Help } from "./ui/Help.js";

const ModeHeading = ({ label }: { label: string }) => (
  <Box marginTop={1}>
    <Text bold>{`▸ ${label}`}</Text>
  </Box>
);

const approvalLabel = (action: Action): string => {
  if (action.kind === "edit") return action.path;
  if (action.kind === "command") return action.command;
  return action.target;
};

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
  const [lastAction, setLastAction] = useState<LastActionState | null>(null);
  const [staging, setStaging] = useState(false);
  const [staged, setStaged] = useState<StagedSelection | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const { exit } = useApp();
  const { focusNext } = useFocusManager();

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
  const open = openId ? state.approvals[openId] : undefined;
  const inboxActions: ActionKind[] = (() => {
    if (!open) return [];
    const ag = state.agents[open.agentId];
    const isActive = ag?.status !== "done" && ag?.status !== "cancelled";
    const a: ActionKind[] = ["approve"];
    if (open.action.kind === "command") a.push("edit");
    if (open.action.kind === "edit") a.push("stage");
    a.push("deny");
    if (isActive) a.push("steer", "cancel");
    return a;
  })();

  const focusedApprovalId = (() => {
    if (mode === "inbox") return openId;
    if (mode === "agentDetail" && detailAgentId) {
      const dp = pendingForAgent(state, detailAgentId);
      return dp[Math.min(cursor, Math.max(dp.length - 1, 0))]?.id ?? null;
    }
    return null;
  })();

  useEffect(() => {
    setStaged(null);
    setStaging(false);
  }, [focusedApprovalId]);

  useEffect(() => {
    if (staging) focusNext();
  }, [staging, focusNext]);

  const approveApproval = (ap: Approval) => {
    if (ap.action.kind === "edit" && staged) {
      const subset = materializeStaged(staged, ap.action);
      if (subset.length === 0) return false;
      if (subset.length < ap.action.hunks.length) {
        source.decide(ap.id, { action: "edit", editedAction: { ...ap.action, hunks: subset } });
        setLastAction({ verb: "edited", label: approvalLabel(ap.action) });
        return true;
      }
    }
    source.decide(ap.id, { action: "approve" });
    setLastAction({ verb: "approved", label: approvalLabel(ap.action) });
    return true;
  };

  useInput((input, key) => {
    if (staging) {
      if (key.escape) {
        if (staged !== null && staged.stagedHunks.length === 0) setStaged(null);
        setStaging(false);
      }
      return;
    }

    const textActive = editing !== null || steerText !== null;

    if (textActive) {
      if (steerText !== null) {
        if (key.return) {
          const targetAgentId = detailAgentId ?? (openId ? state.approvals[openId]?.agentId : null);
          if (targetAgentId && steerText.trim() && state.agents[targetAgentId]) {
            source.steer(targetAgentId, steerText);
            setLastAction({ verb: "steered", label: state.agents[targetAgentId]?.name ?? targetAgentId });
          }
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
          setLastAction({ verb: "edited", label: editing! });
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

    if (input === "?") {
      setShowHelp((v) => !v);
      return;
    }

    if (showHelp) {
      if (key.escape) setShowHelp(false);
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
      } else if (mode === "inbox") {
        setMode("fleet");
        setCursor(0);
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
            setLastAction({ verb: "cancelled", label: a.name });
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
          if (a) {
            const verb = input === "a" ? "approved" : "denied";
            source.decide(a.id, { action: input === "a" ? "approve" : "deny" });
            setLastAction({ verb, label: approvalLabel(a.action) });
          }
        }
        return;
      }

      if (!open) return;

      const inboxAgentId = open.agentId;
      const focusedActionClamped = Math.min(focusedAction, Math.max(inboxActions.length - 1, 0));

      if (key.upArrow || input === "k") {
        const idx = pending.findIndex((a) => a.id === openId);
        const nextIdx = Math.max(idx - 1, 0);
        if (nextIdx !== idx) {
          setOpenId(pending[nextIdx]!.id);
          setCursor(nextIdx);
          setFocusedAction(0);
        }
        return;
      }
      if (key.downArrow || input === "j") {
        const idx = pending.findIndex((a) => a.id === openId);
        const nextIdx = Math.min(idx + 1, pending.length - 1);
        if (nextIdx !== idx) {
          setOpenId(pending[nextIdx]!.id);
          setCursor(nextIdx);
          setFocusedAction(0);
        }
        return;
      }
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
        if (action === "approve" || action === "deny") {
          if (action === "approve") {
            if (!approveApproval(open)) return;
          } else {
            source.decide(open.id, { action: "deny" });
            setLastAction({ verb: "denied", label: approvalLabel(open.action) });
          }
          const idx = pending.findIndex((a) => a.id === open.id);
          const next = pending[idx + 1] ?? null;
          setOpenId(next?.id ?? null);
          if (next) setCursor(idx);
          setFocusedAction(0);
        } else if (action === "stage" && open.action.kind === "edit") {
          setStaging(true);
        } else if (action === "edit" && open.action.kind === "command") {
          setEditing(open.action.command);
          setEditingId(open.id);
        } else if (action === "steer") {
          setSteerText("");
        } else if (action === "cancel") {
          if (armedCancel === inboxAgentId) {
            source.cancel(inboxAgentId);
            setLastAction({ verb: "cancelled", label: state.agents[inboxAgentId]?.name ?? inboxAgentId });
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
      if (focused.action.kind === "edit") detailActions.push("stage");
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
        if (approveApproval(focused)) setFocusedAction(0);
      } else if (action === "deny" && focused) {
        source.decide(focused.id, { action: "deny" });
        setLastAction({ verb: "denied", label: approvalLabel(focused.action) });
        setFocusedAction(0);
      } else if (action === "stage" && focused && focused.action.kind === "edit") {
        setStaging(true);
      } else if (action === "edit" && focused && focused.action.kind === "command") {
        setEditing(focused.action.command);
        setEditingId(focused.id);
      } else if (action === "steer") {
        setSteerText("");
      } else if (action === "cancel") {
        if (armedCancel === detailAgentId) {
          source.cancel(detailAgentId);
          setLastAction({ verb: "cancelled", label: state.agents[detailAgentId]?.name ?? detailAgentId });
          setArmedCancel(null);
        } else {
          setArmedCancel(detailAgentId);
        }
      }
    }
  });

  const editedCommand = editingId && editing !== null ? editing : undefined;

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold>agent-inbox</Text>
      </Box>
      <StatusBar state={state} />
      {!showHelp && mode === "fleet" && <ModeHeading label="Fleet" />}
      {!showHelp && mode === "inbox" && <ModeHeading label="Inbox" />}
      <Box marginTop={1}>
        {showHelp ? (
          <Help />
        ) : (
          <>
            {mode === "fleet" && <Fleet state={state} cursor={cursor} armedCancel={armedCancel} lastAction={lastAction} />}
            {mode === "inbox" &&
              (open ? (
                <Box flexDirection="column">
                  <ApprovalDetail
                    approval={open}
                    agentName={state.agents[open.agentId]?.name ?? open.agentId}
                    editedCommand={editedCommand}
                    staging={staging}
                    onStageChange={setStaged}
                  />
                  {steerText !== null ? (
                    <Box marginTop={1}>
                      <Text color="cyan">
                        {"steer> "}
                        {steerText}
                      </Text>
                    </Box>
                  ) : null}
                  <LastAction lastAction={lastAction} />
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
                lastAction={lastAction}
                staging={staging}
                onStageChange={setStaged}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

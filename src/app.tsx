import { useEffect, useReducer, useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { reduce, emptyState, pendingApprovals } from "./model/store.js";
import type { RunEvent } from "./model/types.js";
import type { AgentSource } from "./source/types.js";
import { createSimulatedSource } from "./source/simulated.js";
import { createRealSource } from "./source/real.js";
import { InboxList } from "./ui/InboxList.js";
import { StatusBar } from "./ui/StatusBar.js";
import { ApprovalDetail } from "./ui/ApprovalDetail.js";

export const App = ({ source: providedSource }: { source?: AgentSource } = {}) => {
  const [source] = useState(
    () => providedSource ?? (process.env["AGENT_INBOX_REAL"] ? createRealSource() : createSimulatedSource()),
  );
  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof emptyState>, e: RunEvent) => reduce(s, e),
    undefined,
    emptyState,
  );
  const [cursor, setCursor] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    const off = source.subscribe(dispatch);
    source.start();
    return () => {
      off();
      source.dispose();
    };
  }, [source]);

  const pending = pendingApprovals(state);
  const safeCursor = Math.min(cursor, Math.max(pending.length - 1, 0));
  const open = openId ? state.approvals[openId] : undefined;

  useEffect(() => {
    if (openId && state.approvals[openId]?.status !== "pending") {
      setOpenId(null);
    }
  }, [openId, state.approvals]);

  useInput((input, key) => {
    if (input === "q" && editing === null) {
      source.dispose();
      exit();
      return;
    }
    if (!open) {
      if (key.downArrow || input === "j")
        setCursor(Math.min(safeCursor + 1, Math.max(pending.length - 1, 0)));
      if (key.upArrow || input === "k") setCursor(Math.max(safeCursor - 1, 0));
      if (key.return) {
        const a = pending[safeCursor];
        if (a) setOpenId(a.id);
      }
      if (input === "a" || input === "d") {
        const a = pending[safeCursor];
        if (a) source.decide(a.id, { action: input === "a" ? "approve" : "deny" });
      }
      return;
    }
    if (editing !== null) {
      if (key.return) {
        if (open.action.kind === "command") {
          source.decide(open.id, {
            action: "edit",
            editedAction: { ...open.action, command: editing },
          });
        }
        setEditing(null);
        setOpenId(null);
      } else if (key.backspace || key.delete) {
        setEditing((e) => (e ?? "").slice(0, -1));
      } else if (input) {
        setEditing((e) => (e ?? "") + input);
      }
      return;
    }
    if (key.escape) setOpenId(null);
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
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold>agent-inbox</Text>
      </Box>
      <StatusBar state={state} />
      <Box marginTop={1}>
        {open ? (
          <ApprovalDetail
            approval={open}
            agentName={state.agents[open.agentId]?.name ?? open.agentId}
            editedCommand={editing ?? undefined}
          />
        ) : (
          <InboxList state={state} cursor={safeCursor} />
        )}
      </Box>
    </Box>
  );
};

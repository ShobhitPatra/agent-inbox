import { Box, Text } from "ink";
import type { StagedSelection } from "@assistant-ui/react-ink";
import type { InboxState } from "../model/types.js";
import { agentRun, pendingForAgent } from "../model/store.js";
import { RunContext } from "./RunContext.js";
import { ApprovalDetail } from "./ApprovalDetail.js";
import { ActionBar } from "./ActionBar.js";
import type { ActionKind } from "./ActionBar.js";
import { LastAction } from "./LastAction.js";
import type { LastActionState } from "./LastAction.js";
import { stepLabel } from "./palette.js";

export const AgentDetail = ({
  state,
  agentId,
  cursor,
  steerText,
  editedCommand,
  armed,
  focusedAction,
  lastAction = null,
  staging = false,
  onStageChange,
}: {
  state: InboxState;
  agentId: string;
  cursor: number;
  steerText: string | null;
  editedCommand?: string;
  armed: boolean;
  focusedAction: number;
  lastAction?: LastActionState | null;
  staging?: boolean;
  onStageChange?: (staged: StagedSelection) => void;
}) => {
  const agent = state.agents[agentId];
  const transcript = agentRun(state, agentId);
  const pending = pendingForAgent(state, agentId);
  const safeCursor = Math.min(cursor, Math.max(pending.length - 1, 0));
  const focused = pending[safeCursor];

  const isActive = agent?.status !== "done" && agent?.status !== "cancelled";
  const actions: ActionKind[] = [];
  if (focused) {
    actions.push("approve");
    if (focused.action.kind === "command") actions.push("edit");
    if (focused.action.kind === "edit") actions.push("stage");
    actions.push("deny");
  }
  if (isActive) actions.push("steer", "cancel");

  const header = focused
    ? `${agent?.name ?? agentId} · ${focused.action.kind} · ${safeCursor + 1}/${pending.length}`
    : `${agent?.name ?? agentId} · ${agent?.status ?? "unknown"} · ${stepLabel(agent?.step)}`;

  return (
    <Box flexDirection="column">
      <Text bold>{header}</Text>
      {transcript.length > 0 ? (
        <Box marginTop={1}>
          <RunContext context={transcript} />
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        {focused ? (
          <ApprovalDetail
            approval={focused}
            agentName={agent?.name ?? agentId}
            editedCommand={editedCommand}
            staging={staging}
            onStageChange={onStageChange}
          />
        ) : (
          <Text dimColor>No pending approvals.</Text>
        )}
      </Box>
      {steerText !== null ? (
        <Box marginTop={1}>
          <Text color="cyan">
            {"steer> "}
            {steerText}
          </Text>
        </Box>
      ) : null}
      <LastAction lastAction={lastAction} />
      {actions.length > 0 ? (
        <ActionBar
          actions={actions}
          focusedIndex={focusedAction}
          armed={armed}
          agentName={agent?.name ?? agentId}
        />
      ) : null}
    </Box>
  );
};

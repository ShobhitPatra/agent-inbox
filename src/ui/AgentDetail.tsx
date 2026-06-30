import { Box, Text } from "ink";
import type { InboxState } from "../model/types.js";
import { agentRun, pendingForAgent } from "../model/store.js";
import { RunContext } from "./RunContext.js";
import { ApprovalDetail } from "./ApprovalDetail.js";

const stepLabel = (step?: { index: number; total?: number }): string =>
  step ? `step ${step.index}/${step.total ?? "?"}` : "";

export const AgentDetail = ({
  state,
  agentId,
  cursor,
  steerText,
  editedCommand,
  armed,
}: {
  state: InboxState;
  agentId: string;
  cursor: number;
  steerText: string | null;
  editedCommand?: string;
  armed: boolean;
}) => {
  const agent = state.agents[agentId];
  const transcript = agentRun(state, agentId);
  const pending = pendingForAgent(state, agentId);
  const safeCursor = Math.min(cursor, Math.max(pending.length - 1, 0));
  const focused = pending[safeCursor];
  return (
    <Box flexDirection="column">
      <Text bold>
        {agent?.name ?? agentId} · {agent?.status ?? "unknown"} · {stepLabel(agent?.step)}
      </Text>
      {transcript.length > 0 ? (
        <Box marginTop={1}>
          <RunContext context={transcript} />
        </Box>
      ) : null}
      <Box marginTop={1} flexDirection="column">
        {focused ? (
          <ApprovalDetail approval={focused} agentName={agent?.name ?? agentId} editedCommand={editedCommand} />
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
      {armed ? (
        <Box marginTop={1}>
          <Text color="red">press c again to cancel {agent?.name ?? agentId}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>a approve · e edit · d deny · s steer · c cancel · esc back</Text>
      </Box>
    </Box>
  );
};

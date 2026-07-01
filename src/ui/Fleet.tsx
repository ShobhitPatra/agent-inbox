import { Box, Text } from "ink";
import type { InboxState } from "../model/types.js";
import { fleet, pendingForAgent } from "../model/store.js";
import { KeyHints } from "./KeyHint.js";
import { LastAction } from "./LastAction.js";
import type { LastActionState } from "./LastAction.js";
import { agentColor, stepLabel } from "./palette.js";

const NAME_WIDTH = 10;
const STATUS_WIDTH = 12;
const STEP_WIDTH = 12;
const PENDING_WIDTH = 12;

const FleetHeader = () => (
  <Box marginBottom={1}>
    <Text>{"    "}</Text>
    <Box width={NAME_WIDTH}>
      <Text dimColor bold>agent</Text>
    </Box>
    <Box width={STATUS_WIDTH}>
      <Text dimColor bold>status</Text>
    </Box>
    <Box width={STEP_WIDTH}>
      <Text dimColor bold>step</Text>
    </Box>
    <Box width={PENDING_WIDTH}>
      <Text dimColor bold>pending</Text>
    </Box>
    <Box>
      <Text dimColor bold>cost</Text>
    </Box>
  </Box>
);

export const Fleet = ({
  state,
  cursor,
  armedCancel,
  lastAction = null,
}: {
  state: InboxState;
  cursor: number;
  armedCancel: string | null;
  lastAction?: LastActionState | null;
}) => {
  const agents = fleet(state);
  if (agents.length === 0) {
    return (
      <Box marginY={1}>
        <Text dimColor>No agents yet.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <FleetHeader />
      {agents.map((a, i) => {
        const pending = pendingForAgent(state, a.id).length;
        const armed = armedCancel === a.id;
        const cancelled = a.status === "cancelled";
        return (
          <Box key={a.id} marginBottom={1}>
            <Text color={i === cursor ? "cyan" : undefined}>{i === cursor ? "❯ " : "  "}</Text>
            <Text color={armed ? "red" : agentColor(a.id)} dimColor={cancelled}>{"● "}</Text>
            <Box width={NAME_WIDTH}>
              <Text color={armed ? "red" : undefined} dimColor={cancelled}>{a.name}</Text>
            </Box>
            <Box width={STATUS_WIDTH}>
              <Text dimColor={cancelled}>{a.status}</Text>
            </Box>
            <Box width={STEP_WIDTH}>
              <Text dimColor={cancelled}>{stepLabel(a.step)}</Text>
            </Box>
            <Box width={PENDING_WIDTH}>
              <Text dimColor={cancelled}>{pending} pending</Text>
            </Box>
            <Box>
              <Text dimColor={cancelled}>{a.cost != null ? `$${a.cost.toFixed(2)}` : ""}</Text>
            </Box>
          </Box>
        );
      })}
      {armedCancel ? (
        <Box marginTop={1}>
          <Text color="red">press c again to cancel {state.agents[armedCancel]?.name ?? armedCancel}</Text>
        </Box>
      ) : null}
      <LastAction lastAction={lastAction} />
      <Box marginTop={1}>
        <KeyHints
          hints={[
            { keyLabel: "enter", action: "open" },
            { keyLabel: "c", action: "cancel" },
            { keyLabel: "i", action: "inbox" },
            { keyLabel: "q", action: "quit" },
          ]}
        />
      </Box>
    </Box>
  );
};

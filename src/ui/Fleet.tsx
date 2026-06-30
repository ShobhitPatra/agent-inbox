import { Box, Text } from "ink";
import type { InboxState } from "../model/types.js";
import { fleet, pendingForAgent } from "../model/store.js";

const PALETTE = ["cyan", "green", "magenta", "yellow"] as const;

const agentColor = (agentId: string): (typeof PALETTE)[number] => {
  let h = 0;
  for (const c of agentId) h = (h + c.charCodeAt(0)) % PALETTE.length;
  return PALETTE[h]!;
};

const stepLabel = (step?: { index: number; total?: number }): string =>
  step ? `step ${step.index}/${step.total ?? "?"}` : "";

export const Fleet = ({
  state,
  cursor,
  armedCancel,
}: {
  state: InboxState;
  cursor: number;
  armedCancel: string | null;
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
      {agents.map((a, i) => {
        const pending = pendingForAgent(state, a.id).length;
        const armed = armedCancel === a.id;
        const cancelled = a.status === "cancelled";
        return (
          <Box key={a.id}>
            <Text color={i === cursor ? "cyan" : undefined}>{i === cursor ? "❯ " : "  "}</Text>
            <Text color={armed ? "red" : agentColor(a.id)} dimColor={cancelled}>{"● "}</Text>
            <Text color={armed ? "red" : undefined} dimColor={cancelled}>
              {a.name}  {a.status}  {stepLabel(a.step)}  {pending} pending  {a.cost != null ? `$${a.cost.toFixed(2)}` : ""}
            </Text>
          </Box>
        );
      })}
      {armedCancel ? (
        <Box marginTop={1}>
          <Text color="red">press c again to cancel {state.agents[armedCancel]?.name ?? armedCancel}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>enter open · c cancel · i inbox · q quit</Text>
      </Box>
    </Box>
  );
};

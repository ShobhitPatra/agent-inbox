import { Box, Text } from "ink";
import type { InboxState } from "../model/types.js";
import { pendingApprovals } from "../model/store.js";

export const StatusBar = ({ state }: { state: InboxState }) => {
  const pending = pendingApprovals(state).length;
  const agents = Object.keys(state.agents).length;
  return (
    <Box>
      <Text dimColor>
        {pending} pending · {agents} agent{agents === 1 ? "" : "s"}
      </Text>
    </Box>
  );
};

import { Box, Text } from "ink";
import type { Action } from "../../model/types.js";

export const SendPayload = ({ action }: { action: Extract<Action, { kind: "send" }> }) => (
  <Box flexDirection="column">
    <Text color="magenta">send → {action.target}</Text>
    <Text>{action.summary}</Text>
    {action.amount != null ? <Text dimColor>amount: {action.amount}</Text> : null}
  </Box>
);

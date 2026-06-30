import { Box, Text } from "ink";
import type { Action } from "../../model/types.js";

export const CommandPayload = ({
  action,
  edited,
}: {
  action: Extract<Action, { kind: "command" }>;
  edited?: string;
}) => (
  <Box flexDirection="column">
    <Text color="yellow">$ {edited ?? action.command}</Text>
    <Text dimColor>cwd: {action.cwd}</Text>
  </Box>
);

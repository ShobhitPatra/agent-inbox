import { Box, Text } from "ink";
import { DiffView } from "@assistant-ui/react-ink";
import { editToPatch } from "../../model/diff.js";
import type { Action } from "../../model/types.js";

export const EditPayload = ({ action }: { action: Extract<Action, { kind: "edit" }> }) => (
  <Box flexDirection="column">
    <Text color="cyan">edit {action.path}</Text>
    <DiffView patch={editToPatch(action)} showLineNumbers />
  </Box>
);

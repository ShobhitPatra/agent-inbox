import { Box, Text } from "ink";
import { StageableDiffView } from "@assistant-ui/react-ink";
import type { StagedSelection } from "@assistant-ui/react-ink";
import { editToPatch } from "../../model/diff.js";
import type { Action } from "../../model/types.js";
import { KeyHints } from "../KeyHint.js";

export const EditPayload = ({
  action,
  staging = false,
  onStageChange,
}: {
  action: Extract<Action, { kind: "edit" }>;
  staging?: boolean;
  onStageChange?: (staged: StagedSelection) => void;
}) => (
  <Box flexDirection="column">
    <Text color="cyan">edit {action.path}</Text>
    <StageableDiffView
      patch={editToPatch(action)}
      showLineNumbers
      isActive={staging}
      onStageChange={onStageChange}
    />
    {staging ? (
      <Box marginTop={1}>
        <KeyHints
          hints={[
            { keyLabel: "↑/↓", action: "hunk" },
            { keyLabel: "space", action: "toggle" },
            { keyLabel: "a", action: "all" },
            { keyLabel: "n", action: "none" },
            { keyLabel: "esc", action: "done" },
          ]}
        />
      </Box>
    ) : null}
  </Box>
);

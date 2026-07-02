import { Box, Text } from "ink";
import { KeyHints } from "./KeyHint.js";

export type ActionKind = "approve" | "stage" | "edit" | "deny" | "steer" | "cancel";

const LABELS: Record<ActionKind, string> = {
  approve: "Approve",
  stage: "Stage",
  edit: "Edit",
  deny: "Deny",
  steer: "Steer",
  cancel: "Cancel",
};

export const ActionBar = ({
  actions,
  focusedIndex,
  armed,
  agentName,
}: {
  actions: ActionKind[];
  focusedIndex: number;
  armed: boolean;
  agentName: string;
}) => {
  const safeFocus = Math.min(focusedIndex, Math.max(actions.length - 1, 0));

  return (
    <Box flexDirection="column" marginTop={1}>
      {armed ? (
        <Box marginBottom={1}>
          <Text color="red">press Enter again to cancel {agentName}</Text>
        </Box>
      ) : null}
      <Box flexDirection="row">
        {actions.map((action, i) => {
          const isFocused = i === safeFocus;
          const label = LABELS[action];
          return (
            <Box key={action} marginRight={i < actions.length - 1 ? 2 : 0}>
              {isFocused ? (
                <Text backgroundColor="white" color="black" bold>{` ${label} `}</Text>
              ) : (
                <Text dimColor>{label}</Text>
              )}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1}>
        <KeyHints
          hints={[
            { keyLabel: "←/→", action: "move" },
            { keyLabel: "enter", action: "act" },
            { keyLabel: "↑/↓", action: "item" },
            { keyLabel: "esc", action: "back" },
          ]}
        />
      </Box>
    </Box>
  );
};

import { Box, Text } from "ink";

export type LastActionState = {
  verb: "approved" | "denied" | "steered" | "cancelled" | "edited";
  label: string;
};

const COLOR: Record<LastActionState["verb"], string> = {
  approved: "green",
  denied: "red",
  steered: "cyan",
  cancelled: "red",
  edited: "yellow",
};

export const LastAction = ({ lastAction }: { lastAction: LastActionState | null }) => {
  if (!lastAction) return null;
  const color = COLOR[lastAction.verb];
  return (
    <Box marginTop={1}>
      <Text>
        <Text color={color} dimColor>
          {lastAction.verb}
        </Text>
        {" · "}
        <Text dimColor>{lastAction.label}</Text>
      </Text>
    </Box>
  );
};

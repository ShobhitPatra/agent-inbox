import { Box, Text } from "ink";

export const KeyHint = ({ keyLabel, action }: { keyLabel: string; action: string }) => (
  <Box>
    <Text bold>{keyLabel}</Text>
    <Text dimColor> {action}</Text>
  </Box>
);

export const KeyHints = ({ hints }: { hints: { keyLabel: string; action: string }[] }) => (
  <Box>
    {hints.map((h, i) => (
      <Box key={h.keyLabel + h.action}>
        <KeyHint keyLabel={h.keyLabel} action={h.action} />
        {i < hints.length - 1 && <Text dimColor> · </Text>}
      </Box>
    ))}
  </Box>
);

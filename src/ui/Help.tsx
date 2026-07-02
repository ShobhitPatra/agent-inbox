import { Box, Text } from "ink";
import { KeyHint } from "./KeyHint.js";

const Section = ({ label }: { label: string }) => (
  <Box marginTop={1}>
    <Text bold>{label}</Text>
  </Box>
);

export const Help = () => (
  <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
    <Box marginTop={1}>
      <Text bold>Keybindings</Text>
    </Box>

    <Section label="Global" />
    <KeyHint keyLabel="?" action="toggle help" />
    <KeyHint keyLabel="f" action="fleet" />
    <KeyHint keyLabel="i" action="inbox" />
    <KeyHint keyLabel="q" action="quit" />

    <Section label="Fleet" />
    <KeyHint keyLabel="↑/↓" action="move" />
    <KeyHint keyLabel="enter" action="open" />
    <KeyHint keyLabel="c" action="cancel" />

    <Section label="Inbox" />
    <KeyHint keyLabel="↑/↓" action="move" />
    <KeyHint keyLabel="enter" action="open" />
    <KeyHint keyLabel="esc" action="back" />

    <Section label="Agent" />
    <KeyHint keyLabel="←/→" action="move button" />
    <KeyHint keyLabel="enter" action="act" />
    <KeyHint keyLabel="↑/↓" action="item" />
    <KeyHint keyLabel="esc" action="back" />

    <Section label="Staging" />
    <KeyHint keyLabel="↑/↓" action="hunk" />
    <KeyHint keyLabel="space" action="toggle" />
    <KeyHint keyLabel="a" action="all" />
    <KeyHint keyLabel="n" action="none" />
    <KeyHint keyLabel="esc" action="done" />

    <Box marginTop={1} marginBottom={1}>
      <Text dimColor>? or esc to close</Text>
    </Box>
  </Box>
);

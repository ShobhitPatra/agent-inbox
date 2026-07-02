import { Box, Text } from "ink";
import type { InboxState, Approval } from "../model/types.js";
import { filteredPending } from "../model/store.js";
import { KeyHints } from "./KeyHint.js";
import { agentColor } from "./palette.js";

const summary = (a: Approval): string => {
  if (a.action.kind === "edit") {
    const n = a.action.hunks.length;
    return `edit ${a.action.path} (${n} hunk${n === 1 ? "" : "s"})`;
  }
  if (a.action.kind === "command") return `command ${a.action.command}`;
  return `send ${a.action.target}`;
};

const WorkingIndicator = ({ state }: { state: InboxState }) => {
  const runningAgent = Object.values(state.agents).find((a) => a.status === "running");
  if (!runningAgent) return <Text dimColor>No pending actions.</Text>;
  return (
    <Box flexDirection="column">
      <Box>
        <Text color={agentColor(runningAgent.id)} dimColor>
          {"● "}
        </Text>
        <Text dimColor>{runningAgent.name} is working…</Text>
      </Box>
      <Text dimColor>reading {runningAgent.task}…</Text>
    </Box>
  );
};

const inboxFooterHints = [
  { keyLabel: "↑/↓", action: "move" },
  { keyLabel: "enter", action: "open" },
  { keyLabel: "esc", action: "back" },
  { keyLabel: "q", action: "quit" },
];

export const InboxList = ({
  state,
  cursor,
  filter = "",
  filterInput = null,
}: {
  state: InboxState;
  cursor: number;
  filter?: string;
  filterInput?: string | null;
}) => {
  const pending = filteredPending(state, filter);
  if (pending.length === 0) {
    return (
      <Box flexDirection="column">
        <Box marginY={1}>
          {filter ? <Text dimColor>no matches</Text> : <WorkingIndicator state={state} />}
        </Box>
        <Box>
          <KeyHints hints={inboxFooterHints} />
        </Box>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      {filterInput !== null ? (
        <Box marginBottom={1}>
          <Text dimColor>{`filter> ${filterInput}`}</Text>
        </Box>
      ) : filter ? (
        <Box marginBottom={1}>
          <Text dimColor>{`filter: ${filter} (${pending.length} shown)`}</Text>
        </Box>
      ) : null}
      {pending.map((a, i) => (
        <Box key={a.id}>
          <Text color={i === cursor ? "cyan" : undefined}>{i === cursor ? "❯ " : "  "}</Text>
          <Text color={agentColor(a.agentId)}>{"● "}</Text>
          <Text>
            {state.agents[a.agentId]?.name ?? a.agentId}{"  "}{summary(a)}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <KeyHints hints={inboxFooterHints} />
      </Box>
    </Box>
  );
};

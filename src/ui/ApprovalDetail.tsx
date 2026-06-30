import { Box, Text } from "ink";
import type { Approval } from "../model/types.js";
import { RunContext } from "./RunContext.js";
import { EditPayload } from "./payload/EditPayload.js";
import { CommandPayload } from "./payload/CommandPayload.js";
import { SendPayload } from "./payload/SendPayload.js";

export const ApprovalDetail = ({
  approval,
  agentName,
  editedCommand,
}: {
  approval: Approval;
  agentName: string;
  editedCommand?: string;
}) => (
  <Box flexDirection="column">
    <Text bold>
      {agentName} · {approval.action.kind}
    </Text>
    <RunContext context={approval.context} />
    {approval.action.kind === "edit" && <EditPayload action={approval.action} />}
    {approval.action.kind === "command" && (
      <CommandPayload action={approval.action} edited={editedCommand} />
    )}
    {approval.action.kind === "send" && <SendPayload action={approval.action} />}
    <Box marginTop={1}>
      <Text dimColor>a approve · e edit · d deny · esc back</Text>
    </Box>
  </Box>
);

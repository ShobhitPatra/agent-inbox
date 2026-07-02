import { Box, Text } from "ink";
import type { StagedSelection } from "@assistant-ui/react-ink";
import type { Approval } from "../model/types.js";
import { RunContext } from "./RunContext.js";
import { EditPayload } from "./payload/EditPayload.js";
import { CommandPayload } from "./payload/CommandPayload.js";
import { SendPayload } from "./payload/SendPayload.js";

export const ApprovalDetail = ({
  approval,
  agentName,
  editedCommand,
  staging = false,
  onStageChange,
}: {
  approval: Approval;
  agentName: string;
  editedCommand?: string;
  staging?: boolean;
  onStageChange?: (staged: StagedSelection) => void;
}) => (
  <Box flexDirection="column">
    <Text bold>
      {agentName} · {approval.action.kind}
    </Text>
    <RunContext context={approval.context} />
    {approval.action.kind === "edit" && (
      <EditPayload action={approval.action} staging={staging} onStageChange={onStageChange} />
    )}
    {approval.action.kind === "command" && (
      <CommandPayload action={approval.action} edited={editedCommand} />
    )}
    {approval.action.kind === "send" && <SendPayload action={approval.action} />}
  </Box>
);

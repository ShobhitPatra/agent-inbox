import { Box } from "ink";
import { MarkdownText } from "@assistant-ui/react-ink-markdown";
import { ToolCallPrimitive } from "@assistant-ui/react-ink";
import type { ContextPart } from "../model/types.js";

const parseArgs = (argsText: string): unknown => {
  try {
    return JSON.parse(argsText);
  } catch {
    return {};
  }
};

export const RunContext = ({ context }: { context: ContextPart[] }) => (
  <Box flexDirection="column" marginBottom={1}>
    {context.map((p, i) =>
      p.kind === "reasoning" ? (
        <MarkdownText key={i} text={p.text} />
      ) : (
        <ToolCallPrimitive.Fallback
          key={i}
          {...({
            type: "tool-call",
            toolCallId: "ctx",
            toolName: p.toolName,
            args: parseArgs(p.argsText),
            argsText: p.argsText,
            result: p.result,
            status: { type: "complete" },
          } as Parameters<typeof ToolCallPrimitive.Fallback>[0])}
        />
      ),
    )}
  </Box>
);

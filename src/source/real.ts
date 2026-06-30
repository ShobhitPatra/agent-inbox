import { generateText, tool, isStepCount } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { AgentSource } from "./types.js";
import type { RunEvent } from "../model/types.js";
import { resolveConfig } from "./config.js";
import { createWaiters, runGated, isDisposeSentinel } from "./realCore.js";

const FIXTURE_DIR = resolvePath(fileURLToPath(import.meta.url), "../../../fixtures/sample-repo");

const AGENT = {
  id: "real-agent",
  name: "real",
  task: "add input validation across signup endpoints, run tests, open PR",
  status: "running" as const,
};

const TASK = `You are an autonomous coding agent working on a Node.js/Express project in the fixtures/sample-repo directory.

Your task: add zod input validation to these three route handlers so each validates req.body before use: signup.ts, login.ts, reset-password.ts.

Workflow:
1. Read each file to understand the current code (use the read tool)
2. Propose edits to add validation (use the edit tool for each file — you can call multiple edit tools in one response for parallel independent changes)
3. Propose running the test suite with run_command
4. Propose opening a PR with send

Each gated tool call (edit, run_command, send) requires human approval before it takes effect. The human will approve, deny, or edit your proposal. Continue after each decision.`;

export const createRealSource = (): AgentSource => {
  const subs = new Set<(e: RunEvent) => void>();
  const emit = (e: RunEvent) => {
    if (disposed) return;
    subs.forEach((cb) => cb(e));
  };
  const { waitDecision, decide, disposeWaiters } = createWaiters();
  const controller = new AbortController();
  let disposed = false;

  const run = async () => {
    try {
      const cfg = resolveConfig();
      const provider = createOpenAICompatible({
        name: "agent-inbox",
        baseURL: cfg.baseURL,
        apiKey: cfg.apiKey,
      });
      const model = provider(cfg.model);

      emit({ type: "agentStatusChanged", agent: AGENT });

      await generateText({
        model,
        abortSignal: controller.signal,
        stopWhen: isStepCount(20),
        system: TASK,
        prompt: "Begin by reading the three handler files, then propose your edits.",
        tools: {
          read: tool({
            description: "Read a file from the project",
            inputSchema: z.object({
              path: z.string().describe("Relative path from project root (e.g. signup.ts)"),
            }),
            execute: async ({ path }) => {
              try {
                const content = await readFile(join(FIXTURE_DIR, path), "utf-8");
                return `=== ${path} ===\n${content}`;
              } catch {
                return `File not found: ${path}`;
              }
            },
          }),
          search: tool({
            description: "Search for a text pattern across project files",
            inputSchema: z.object({
              pattern: z.string().describe("Text to search for"),
            }),
            execute: async ({ pattern }) => {
              const files = ["signup.ts", "login.ts", "reset-password.ts"];
              const results: string[] = [];
              for (const f of files) {
                try {
                  const content = await readFile(join(FIXTURE_DIR, f), "utf-8");
                  if (content.includes(pattern)) results.push(`${f}: contains '${pattern}'`);
                } catch {}
              }
              return results.length > 0 ? results.join("\n") : "No matches found";
            },
          }),
          edit: tool({
            description:
              "Propose an edit to a file. Requires human approval before the change applies. You may call this tool multiple times in parallel for independent files.",
            inputSchema: z.object({
              path: z.string().describe("Relative path to the file"),
              oldString: z.string().describe("Exact text to replace"),
              newString: z.string().describe("Replacement text"),
              reasoning: z.string().describe("Why this change is needed"),
            }),
            execute: async ({ path, oldString, newString, reasoning }, { toolCallId }) => {
              const approval = {
                id: `edit-${toolCallId}`,
                agentId: AGENT.id,
                createdAt: Date.now(),
                action: { kind: "edit" as const, path, hunks: [{ oldString, newString }] },
                context: [{ kind: "reasoning" as const, text: reasoning }],
              };
              emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "waiting" } });
              try {
                const decision = await runGated(approval, emit, waitDecision);
                emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "running" } });
                return decision.action === "deny" ? "change denied by user" : "change approved";
              } catch (e) {
                if (isDisposeSentinel(e)) return "aborted";
                throw e;
              }
            },
          }),
          run_command: tool({
            description: "Propose running a shell command. Requires human approval.",
            inputSchema: z.object({
              command: z.string().describe("The command to run"),
              cwd: z.string().default(".").describe("Working directory"),
              reasoning: z.string().describe("Why this command is needed"),
            }),
            execute: async ({ command, cwd, reasoning }, { toolCallId }) => {
              const approval = {
                id: `cmd-${toolCallId}`,
                agentId: AGENT.id,
                createdAt: Date.now(),
                action: { kind: "command" as const, command, cwd },
                context: [{ kind: "reasoning" as const, text: reasoning }],
              };
              emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "waiting" } });
              try {
                const decision = await runGated(approval, emit, waitDecision);
                emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "running" } });
                return decision.action === "deny" ? "command denied" : "command approved";
              } catch (e) {
                if (isDisposeSentinel(e)) return "aborted";
                throw e;
              }
            },
          }),
          send: tool({
            description: "Propose sending a message or opening a PR. Requires human approval.",
            inputSchema: z.object({
              target: z.string().describe("Target (e.g. 'github:pr')"),
              summary: z.string().describe("Summary of what to send"),
              reasoning: z.string().describe("Why this action is needed"),
            }),
            execute: async ({ target, summary, reasoning }, { toolCallId }) => {
              const approval = {
                id: `send-${toolCallId}`,
                agentId: AGENT.id,
                createdAt: Date.now(),
                action: { kind: "send" as const, target, summary },
                context: [{ kind: "reasoning" as const, text: reasoning }],
              };
              emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "waiting" } });
              try {
                const decision = await runGated(approval, emit, waitDecision);
                emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "running" } });
                return decision.action === "deny" ? "action denied" : "action approved";
              } catch (e) {
                if (isDisposeSentinel(e)) return "aborted";
                throw e;
              }
            },
          }),
        },
      });

      emit({ type: "agentFinished", agentId: AGENT.id });
    } catch (e) {
      if (disposed) return;
      if (e instanceof Error && e.name === "AbortError") return;
      if (isDisposeSentinel(e)) return;
      throw e;
    }
  };

  return {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: (id, d) => decide(id, d),
    start: () => {
      void run();
    },
    stop: () => {
      controller.abort();
    },
    dispose: () => {
      disposed = true;
      controller.abort();
      disposeWaiters();
    },
  };
};

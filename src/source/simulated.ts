import type { AgentSource, Decision } from "./types.js";
import type { RunEvent } from "../model/types.js";

const DISPOSE_SENTINEL = Symbol("dispose");

const isDisposeSentinel = (e: unknown): boolean =>
  e === DISPOSE_SENTINEL;

const AGENT = {
  id: "demo",
  name: "demo",
  task: "add validation to signup, then test & PR",
  status: "running" as const,
};

export const createSimulatedSource = (opts: { stepMs?: number } = {}): AgentSource => {
  const stepMs = opts.stepMs ?? 1200;
  const subs = new Set<(e: RunEvent) => void>();
  const pendingWaiters = new Map<string, { resolve: (d: Decision) => void; reject: (e: unknown) => void }>();
  let stopped = false;
  let disposed = false;
  let sleepCanceller: (() => void) | null = null;

  const emit = (e: RunEvent) => {
    if (disposed) return;
    subs.forEach((cb) => cb(e));
  };

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (disposed) { reject(DISPOSE_SENTINEL); return; }
      const t = setTimeout(() => { sleepCanceller = null; resolve(); }, ms);
      sleepCanceller = () => { clearTimeout(t); sleepCanceller = null; reject(DISPOSE_SENTINEL); };
    });

  const waitDecision = (approvalId: string): Promise<Decision> =>
    new Promise<Decision>((resolve, reject) => {
      if (disposed) { reject(DISPOSE_SENTINEL); return; }
      pendingWaiters.set(approvalId, { resolve, reject });
    });

  const run = async () => {
    try {
      emit({ type: "agentStatusChanged", agent: AGENT });

      await sleep(stepMs);

      const batchApprovals = [
        {
          id: "ap-edit-1",
          agentId: "demo",
          createdAt: Date.now(),
          action: {
            kind: "edit" as const,
            path: "src/routes/signup.ts",
            hunks: [
              {
                oldString: "const body = req.body;",
                newString:
                  "const body = signupSchema.parse(req.body);",
              },
            ],
          },
          context: [
            {
              kind: "reasoning" as const,
              text: "The signup endpoint accepts req.body without validation. Adding a zod parse here ensures we reject malformed payloads at the boundary before any downstream use.",
            },
          ],
        },
        {
          id: "ap-edit-2",
          agentId: "demo",
          createdAt: Date.now() + 1,
          action: {
            kind: "edit" as const,
            path: "src/routes/login.ts",
            hunks: [
              {
                oldString: "const { email, password } = req.body;",
                newString:
                  "const { email, password } = loginSchema.parse(req.body);",
              },
            ],
          },
          context: [
            {
              kind: "reasoning" as const,
              text: "The login endpoint reads email and password directly from req.body without schema validation. Parsing through loginSchema validates shape and types before the credential check.",
            },
          ],
        },
        {
          id: "ap-edit-3",
          agentId: "demo",
          createdAt: Date.now() + 2,
          action: {
            kind: "edit" as const,
            path: "src/routes/reset-password.ts",
            hunks: [
              {
                oldString: "const { token, newPassword } = req.body;",
                newString:
                  "const { token, newPassword } = resetPasswordSchema.parse(req.body);",
              },
            ],
          },
          context: [
            {
              kind: "reasoning" as const,
              text: "The reset-password endpoint uses token and newPassword from req.body without validation. Parsing through resetPasswordSchema enforces minimum password length and token format before processing.",
            },
          ],
        },
      ];

      for (const ap of batchApprovals) {
        emit({ type: "approvalRequested", approval: ap });
      }
      emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "waiting" } });

      const batchDecisions = await Promise.all(
        batchApprovals.map((ap) => waitDecision(ap.id).then((d) => ({ id: ap.id, decision: d }))),
      );

      for (const { id, decision } of batchDecisions) {
        emit({
          type: "approvalResolved",
          approvalId: id,
          status: decision.action === "deny" ? "denied" : "approved",
        });
      }

      if (stopped) return;

      emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "running" } });
      await sleep(stepMs);

      const cmdApproval = {
        id: "ap-cmd-1",
        agentId: "demo",
        createdAt: Date.now() + 3,
        action: { kind: "command" as const, command: "npm test", cwd: "." },
        context: [
          {
            kind: "reasoning" as const,
            text: "Run the suite to confirm the changes are safe.",
          },
        ],
      };

      emit({ type: "approvalRequested", approval: cmdApproval });
      emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "waiting" } });

      const cmdDecision = await waitDecision(cmdApproval.id);
      emit({
        type: "approvalResolved",
        approvalId: cmdApproval.id,
        status: cmdDecision.action === "deny" ? "denied" : "approved",
      });

      if (stopped) return;

      emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "running" } });
      await sleep(stepMs);

      const sendApproval = {
        id: "ap-send-1",
        agentId: "demo",
        createdAt: Date.now() + 4,
        action: {
          kind: "send" as const,
          target: "github:pr",
          summary: "Open PR: validate signup endpoints",
        },
        context: [
          {
            kind: "reasoning" as const,
            text: "Tests pass; open a PR for review.",
          },
        ],
      };

      emit({ type: "approvalRequested", approval: sendApproval });
      emit({ type: "agentStatusChanged", agent: { ...AGENT, status: "waiting" } });

      const sendDecision = await waitDecision(sendApproval.id);
      emit({
        type: "approvalResolved",
        approvalId: sendApproval.id,
        status: sendDecision.action === "deny" ? "denied" : "approved",
      });

      if (stopped) return;

      emit({ type: "agentFinished", agentId: AGENT.id });
    } catch (e) {
      if (!isDisposeSentinel(e)) throw e;
    }
  };

  return {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: (id, d) => {
      const waiter = pendingWaiters.get(id);
      if (waiter) {
        pendingWaiters.delete(id);
        waiter.resolve(d);
      }
    },
    start: () => {
      void run();
    },
    stop: () => {
      stopped = true;
    },
    dispose: () => {
      disposed = true;
      stopped = true;
      if (sleepCanceller) sleepCanceller();
      for (const [, waiter] of pendingWaiters) {
        waiter.reject(DISPOSE_SENTINEL);
      }
      pendingWaiters.clear();
    },
  };
};

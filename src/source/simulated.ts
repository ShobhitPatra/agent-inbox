import type { AgentSource, Decision } from "./types.js";
import type { RunEvent, Agent, Action } from "../model/types.js";

const DISPOSE_SENTINEL = Symbol("dispose");

const isDisposeSentinel = (e: unknown): boolean => e === DISPOSE_SENTINEL;

export type WaveApproval = { idSuffix: string; action: Action; reasoning: string };
export type Wave = { note?: string; approvals: WaveApproval[] };
export type SimulatedScript = { leadingNotes?: string[]; waves: Wave[] };

export type SimulatedOptions = {
  stepMs?: number;
  agentId?: string;
  idPrefix?: string;
  name?: string;
  task?: string;
  startDelayMs?: number;
  script?: SimulatedScript;
};

export const DEFAULT_SCRIPT: SimulatedScript = {
  leadingNotes: ["Scanning the signup, login and reset-password handlers for missing input validation."],
  waves: [
    {
      approvals: [
        {
          idSuffix: "ap-edit-1",
          action: { kind: "edit", path: "src/routes/signup.ts", hunks: [{ oldString: "const body = req.body;", newString: "const body = signupSchema.parse(req.body);" }] },
          reasoning: "The signup endpoint accepts req.body without validation. Adding a zod parse here ensures we reject malformed payloads at the boundary before any downstream use.",
        },
        {
          idSuffix: "ap-edit-2",
          action: { kind: "edit", path: "src/routes/login.ts", hunks: [{ oldString: "const { email, password } = req.body;", newString: "const { email, password } = loginSchema.parse(req.body);" }] },
          reasoning: "The login endpoint reads email and password directly from req.body without schema validation. Parsing through loginSchema validates shape and types before the credential check.",
        },
        {
          idSuffix: "ap-edit-3",
          action: { kind: "edit", path: "src/routes/reset-password.ts", hunks: [{ oldString: "const { token, newPassword } = req.body;", newString: "const { token, newPassword } = resetPasswordSchema.parse(req.body);" }] },
          reasoning: "The reset-password endpoint uses token and newPassword from req.body without validation. Parsing through resetPasswordSchema enforces minimum password length and token format before processing.",
        },
      ],
    },
    {
      note: "Edits resolved. Preparing to run the test suite to confirm the changes are safe.",
      approvals: [{ idSuffix: "ap-cmd-1", action: { kind: "command", command: "npm test", cwd: "." }, reasoning: "Run the suite to confirm the changes are safe." }],
    },
    {
      note: "Tests addressed. Preparing to open a pull request for review.",
      approvals: [{ idSuffix: "ap-send-1", action: { kind: "send", target: "github:pr", summary: "Open PR: validate signup endpoints" }, reasoning: "Tests pass; open a PR for review." }],
    },
  ],
};

export const createSimulatedSource = (opts: SimulatedOptions = {}): AgentSource => {
  const stepMs = opts.stepMs ?? 1200;
  const agentId = opts.agentId ?? "demo";
  const idPrefix = opts.idPrefix ?? "";
  const name = opts.name ?? "demo";
  const task = opts.task ?? "add validation to signup, then test & PR";
  const startDelayMs = opts.startDelayMs ?? 0;
  const script = opts.script ?? DEFAULT_SCRIPT;
  const id = (suffix: string) => `${idPrefix}${suffix}`;

  const subs = new Set<(e: RunEvent) => void>();
  const pendingWaiters = new Map<string, { resolve: (d: Decision) => void; reject: (e: unknown) => void }>();
  let stopped = false;
  let disposed = false;
  let sleepCanceller: (() => void) | null = null;
  let stepIndex = 0;
  let cost = 0;

  const emit = (e: RunEvent) => {
    if (disposed) return;
    subs.forEach((cb) => cb(e));
  };

  const statusAgent = (status: Agent["status"]): Agent => ({
    id: agentId,
    name,
    task,
    status,
    step: { index: stepIndex },
    cost: Number(cost.toFixed(2)),
  });

  const advance = () => {
    stepIndex += 1;
    cost += 0.01;
  };

  const note = (text: string) => emit({ type: "runUpdated", agentId, context: [{ kind: "reasoning", text }] });

  const sleep = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (disposed) {
        reject(DISPOSE_SENTINEL);
        return;
      }
      const t = setTimeout(() => {
        sleepCanceller = null;
        resolve();
      }, ms);
      sleepCanceller = () => {
        clearTimeout(t);
        sleepCanceller = null;
        reject(DISPOSE_SENTINEL);
      };
    });

  const waitDecision = (approvalId: string): Promise<Decision> =>
    new Promise<Decision>((resolve, reject) => {
      if (disposed) {
        reject(DISPOSE_SENTINEL);
        return;
      }
      pendingWaiters.set(approvalId, { resolve, reject });
    });

  const run = async () => {
    try {
      await sleep(startDelayMs);
      emit({ type: "agentStatusChanged", agent: statusAgent("running") });

      for (const text of script.leadingNotes ?? []) {
        if (stopped) return;
        note(text);
        await sleep(stepMs);
      }

      for (const wave of script.waves) {
        if (stopped) return;
        if (wave.note) {
          advance();
          emit({ type: "agentStatusChanged", agent: statusAgent("running") });
          note(wave.note);
          await sleep(stepMs);
        }

        const approvals = wave.approvals.map((wa) => ({
          id: id(wa.idSuffix),
          agentId,
          createdAt: Date.now(),
          action: wa.action,
          context: [{ kind: "reasoning" as const, text: wa.reasoning }],
        }));

        for (const ap of approvals) emit({ type: "approvalRequested", approval: ap });
        emit({ type: "agentStatusChanged", agent: statusAgent("waiting") });

        const decisions = await Promise.all(
          approvals.map((ap) => waitDecision(ap.id).then((d) => ({ id: ap.id, decision: d }))),
        );
        for (const { id: resolvedId, decision } of decisions) {
          emit({ type: "approvalResolved", approvalId: resolvedId, status: decision.action === "deny" ? "denied" : "approved" });
        }
        if (stopped) return;
      }

      emit({ type: "agentFinished", agentId });
    } catch (e) {
      if (!isDisposeSentinel(e)) throw e;
    }
  };

  return {
    subscribe: (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    decide: (decideId, d) => {
      const waiter = pendingWaiters.get(decideId);
      if (waiter) {
        pendingWaiters.delete(decideId);
        waiter.resolve(d);
      }
    },
    steer: (targetId, text) => {
      if (targetId !== agentId) return;
      note(`↳ steering: "${text}" — folding into next step`);
    },
    cancel: (targetId) => {
      if (targetId !== agentId) return;
      stopped = true;
      emit({ type: "agentStatusChanged", agent: statusAgent("cancelled") });
      for (const [pid, waiter] of pendingWaiters) {
        emit({ type: "approvalResolved", approvalId: pid, status: "denied" });
        waiter.reject(DISPOSE_SENTINEL);
      }
      pendingWaiters.clear();
      if (sleepCanceller) sleepCanceller();
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

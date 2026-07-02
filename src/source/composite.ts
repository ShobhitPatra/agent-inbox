import type { AgentSource } from "./types.js";
import { createSimulatedSource, type SimulatedScript } from "./simulated.js";

export type CompositeChild = { agentId: string; source: AgentSource };

export const combineSources = (children: CompositeChild[]): AgentSource => {
  const childFor = (agentId: string) => children.find((c) => c.agentId === agentId)?.source;
  return {
    subscribe: (cb) => {
      const offs = children.map((c) => c.source.subscribe(cb));
      return () => offs.forEach((off) => off());
    },
    decide: (approvalId, decision) => {
      for (const c of children) c.source.decide(approvalId, decision);
    },
    steer: (agentId, text) => {
      childFor(agentId)?.steer(agentId, text);
    },
    cancel: (agentId) => {
      childFor(agentId)?.cancel(agentId);
    },
    start: () => {
      for (const c of children) c.source.start();
    },
    stop: () => {
      for (const c of children) c.source.stop();
    },
    dispose: () => {
      for (const c of children) c.source.dispose();
    },
  };
};

const REFACTOR_SCRIPT: SimulatedScript = {
  leadingNotes: [
    "Surveying req.body access across the route handlers.",
    "Spotting the duplicated validation shape worth extracting.",
    "Drafting a shared validators module before migrating call sites.",
  ],
  waves: [
    {
      note: "Proposing the shared validators module and the call-site migrations.",
      approvals: [
        {
          idSuffix: "ap-edit-1",
          action: {
            kind: "edit",
            path: "src/lib/validators.ts",
            hunks: [
              { oldString: "// signupSchema", newString: "export const signupSchema = z.object({ email: z.string().email(), password: z.string().min(8) });" },
              { oldString: "// loginSchema", newString: "export const loginSchema = z.object({ email: z.string().email(), password: z.string() });" },
              { oldString: "// resetSchema", newString: "export const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) });" },
            ],
          },
          reasoning: "Centralize the validation shapes in one shared module so every route reuses a single source of truth.",
        },
        {
          idSuffix: "ap-edit-2",
          action: {
            kind: "edit",
            path: "src/routes/signup.ts",
            hunks: [{ oldString: "const body = req.body;", newString: "const body = signupSchema.parse(req.body);" }],
          },
          reasoning: "Migrate the signup handler onto the shared schema.",
        },
        {
          idSuffix: "ap-edit-3",
          action: {
            kind: "edit",
            path: "src/routes/login.ts",
            hunks: [{ oldString: "const creds = req.body;", newString: "const creds = loginSchema.parse(req.body);" }],
          },
          reasoning: "Migrate the login handler onto the shared schema.",
        },
      ],
    },
  ],
};

const OPS_SCRIPT: SimulatedScript = {
  leadingNotes: ["Preparing the release: outstanding migrations, then a production deploy."],
  waves: [
    {
      approvals: [
        {
          idSuffix: "ap-cmd-1",
          action: { kind: "command", command: "npm run migrate:prod", cwd: "." },
          reasoning: "Apply the outstanding database migrations to production.",
        },
        {
          idSuffix: "ap-cmd-2",
          action: { kind: "command", command: "npm run deploy -- --env=prod --force", cwd: "." },
          reasoning: "Force-deploy the release to production.",
        },
        {
          idSuffix: "ap-send-1",
          action: { kind: "send", target: "slack:#eng", summary: "Shipping release to prod now" },
          reasoning: "Notify the engineering channel that the deploy is starting.",
        },
      ],
    },
  ],
};

export const createFleetSource = (opts: { stepMs?: number } = {}): AgentSource => {
  const stepMs = opts.stepMs ?? 1200;
  const children: CompositeChild[] = [
    {
      agentId: "coder",
      source: createSimulatedSource({
        stepMs,
        agentId: "coder",
        idPrefix: "coder-",
        name: "coder",
        task: "add validation to signup, then test & PR",
        startDelayMs: 0,
      }),
    },
    {
      agentId: "refactor",
      source: createSimulatedSource({
        stepMs,
        agentId: "refactor",
        idPrefix: "refactor-",
        name: "refactor",
        task: "extract shared validation helpers across routes",
        startDelayMs: Math.round(stepMs / 6),
        script: REFACTOR_SCRIPT,
      }),
    },
    {
      agentId: "ops",
      source: createSimulatedSource({
        stepMs,
        agentId: "ops",
        idPrefix: "ops-",
        name: "ops",
        task: "run migrations and ship the release",
        startDelayMs: Math.round(stepMs / 3),
        script: OPS_SCRIPT,
      }),
    },
  ];
  return combineSources(children);
};

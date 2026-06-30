export type ResolvedConfig = {
  baseURL: string;
  apiKey: string;
  model: string;
};

export const resolveConfig = (env: NodeJS.ProcessEnv = process.env): ResolvedConfig => {
  const missing: string[] = [];
  const baseURL = env["AGENT_INBOX_BASE_URL"];
  const apiKey = env["AGENT_INBOX_API_KEY"];
  const model = env["AGENT_INBOX_MODEL"];

  if (!baseURL) missing.push("AGENT_INBOX_BASE_URL");
  if (!apiKey) missing.push("AGENT_INBOX_API_KEY");
  if (!model) missing.push("AGENT_INBOX_MODEL");

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}.\n` +
        `Example: AGENT_INBOX_BASE_URL=https://api.openai.com/v1 AGENT_INBOX_API_KEY=sk-... AGENT_INBOX_MODEL=gpt-4o AGENT_INBOX_REAL=1 node dist/index.js`,
    );
  }

  return { baseURL: baseURL!, apiKey: apiKey!, model: model! };
};

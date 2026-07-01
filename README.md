# agent-inbox

"kubectl for AI agents": a terminal control room where a fleet of autonomous agents queue the actions they want to take (edit / command / send) and a human observes, approves, edits, steers, or cancels. The run-time oversight surface, riding on top of whatever runs the agents.

## What you get

Three views, switchable at any time.

**Fleet** shows every agent at a glance: name, status, current step, pending action count, and cost. Navigate the list and drill into any agent or cancel it.

**Inbox** is the cross-agent approval queue. Every pending action from every agent lands here in one list. Open an action to read the agent's reasoning, then approve, deny, edit the command string, steer the agent onto a new direction, or cancel the whole agent.

**Agent detail** shows a single agent's reasoning transcript alongside its focused pending action, with the same approve / deny / edit / steer / cancel bar. Use it when you want to stay focused on one agent rather than triaging the cross-agent queue.

## Run it

```bash
pnpm install
pnpm dev
```

Out of the box `pnpm dev` runs a scripted three-agent demo (coder / refactor / ops) with no API key and no network required. The app needs a real terminal (TTY) and does not render correctly in a pipe or dumb terminal. On-screen footers show the keys for the current view.

## Real agent (BYOK)

By default the inbox runs the offline scripted demo. To connect a live agent, copy `.env.example` to `.env`, fill in your credentials, and run `pnpm dev`. The `.env` is gitignored and auto-loaded.

```bash
cp .env.example .env   # edit .env: set AGENT_INBOX_API_KEY and keep AGENT_INBOX_REAL=1
pnpm dev
```

```env
AGENT_INBOX_REAL=1
AGENT_INBOX_BASE_URL=https://api.openai.com/v1
AGENT_INBOX_API_KEY=sk-...
AGENT_INBOX_MODEL=gpt-4o
```

| Variable | Purpose |
|----------|---------|
| `AGENT_INBOX_REAL` | Set to any non-empty value to use the real agent instead of the demo |
| `AGENT_INBOX_BASE_URL` | Base URL of an OpenAI-compatible chat completions endpoint |
| `AGENT_INBOX_API_KEY` | API key for that endpoint |
| `AGENT_INBOX_MODEL` | Model ID (e.g. `gpt-4o`, or your provider's model id) |

The real agent targets the fixture Express handlers in `fixtures/sample-repo/` and proposes edits, a test run, and a PR, all gated on your approval. This mode is early: it builds and the approval flow works, but it is not yet hardened for production use.

## Develop

This repo dev-links `@assistant-ui/react-ink` and `@assistant-ui/react-ink-markdown` from a local monorepo build via `file:` tarballs in a gitignored `.vendor/` directory, so the inbox and any upstream react-ink primitive can co-evolve in one edit loop.

```bash
pnpm test       # vitest unit tests
pnpm typecheck
pnpm lint
pnpm build
```

## License

MIT

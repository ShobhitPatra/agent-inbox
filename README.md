# agent-inbox

**kubectl for AI agents.** A terminal app where autonomous AI agents queue the actions they want
to take (edit / command / send) and a human clears that queue — approve, edit, or deny — with the
agent's reasoning rendered as context.

It is the run-time control client for agents: observe what they want to do, and steer it. It rides
on top of whatever *runs* the agents (a local demo agent today), not the orchestrator itself.

## Status

Early showcase. Single-agent (n=1) approval inbox, built on
[`@assistant-ui/react-ink`](https://github.com/assistant-ui/assistant-ui).

## Develop

This repo dev-links `@assistant-ui/react-ink` and `@assistant-ui/react-ink-markdown` from a local
checkout of the assistant-ui monorepo (not the published versions), so the inbox and any upstream
react-ink primitive can co-evolve in one edit loop. The links are `file:` tarballs packed from the
monorepo build into a gitignored `.vendor/`.

```bash
pnpm install
pnpm dev        # run the inbox
pnpm test       # unit tests (read model, source, diff helper)
pnpm typecheck
pnpm build
```

## Real agent (BYOK)

By default the inbox runs a scripted simulated source — no key needed, works offline.

To run a live AI agent (any OpenAI-compatible provider), copy `.env.example` to `.env`, fill in your key, and run `pnpm dev` — the `.env` is auto-loaded (and gitignored, so the key is never committed):

```bash
cp .env.example .env   # then edit .env and set AGENT_INBOX_API_KEY
pnpm dev
```

`.env`:

```
AGENT_INBOX_REAL=1
AGENT_INBOX_BASE_URL=https://api.openai.com/v1
AGENT_INBOX_API_KEY=sk-...
AGENT_INBOX_MODEL=gpt-4o
```

Leave `AGENT_INBOX_REAL` unset (or remove `.env`) to run the offline simulated demo with no key.

| Var | Purpose |
|-----|---------|
| `AGENT_INBOX_REAL` | Set to any non-empty value to use the real agent instead of the simulator |
| `AGENT_INBOX_BASE_URL` | Base URL of an OpenAI-compatible chat completions endpoint |
| `AGENT_INBOX_API_KEY` | API key for the provider |
| `AGENT_INBOX_MODEL` | Model ID to use (e.g. `gpt-4o`, `claude-3-5-sonnet-20241022`) |

The real agent edits the fixture files in `fixtures/sample-repo/` (three Express handlers that read `req.body` without validation). It proposes edits, a test run, and a PR — all gated on your approval.

## License

MIT

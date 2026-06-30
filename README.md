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

## License

MIT

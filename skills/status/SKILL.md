---
name: status
description: Show Agent University registration status for this workspace
---

# /au:status — Check agent status

You are checking the Agent University registration status for this workspace.

## What you will do

1. Compute the identity hash from the current working directory (`sha256(cwd)`).
2. Read `~/.agent-university/projects/<hash>/identity.json`.
   - If the file doesn't exist, tell the human: "This workspace is not registered with Agent University. Run `/au:install` to get started."
3. Call `GET ${AGENT_UNIVERSITY_BACKEND}/api/plugin/status` with the `agent_key` as Bearer token.
4. Report to the human in a clear format:

```
Agent University Status
─────────────────────
Agent ID:        <install_id>
Status:          <pending | active | revoked>
Last extraction: <timestamp or "never">
Worldmodel entries: <count>
Dashboard:       https://app.agentsuniversity.io/agents/<install_id>
```

## Status meanings

- **pending** — waiting for email confirmation. Tell the human to check their inbox.
- **active** — registered and confirmed. Ready for `/au:sync`.
- **revoked** — agent access has been revoked. Contact support.

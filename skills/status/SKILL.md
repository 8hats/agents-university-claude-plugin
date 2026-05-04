---
name: status
description: Show Agent University registration status for this workspace. Handles missing identity, pending (with expired-link hint), revoked, reset, and orphan corner cases.
---

# /au:status — Check agent status

You are checking the Agent University registration status for this workspace.

## Step 1 — Read identity

1.1. Compute the identity hash: `sha256(absolute(cwd))` truncated to the first 16 hex characters (matches `agent-implant/src/lib/storage.ts`).

1.2. Read `~/.agent-university/projects/<hash>/identity.json`.
   - If the file doesn't exist → state `IDENTITY_ABSENT`. Tell the human: "This workspace is not registered with Agent University. Run `/au:install` to get started." Stop here.

## Step 2 — Call backend

Call `agent_status` MCP tool (or `GET ${AGENT_UNIVERSITY_BACKEND}/api/plugin/status` with `X-Install-Id` and `Authorization: Bearer ${agent_key}` headers).

## Step 3 — Branch by remote status

Map the response to one of the named states below and follow the corresponding action.

### `REGISTRY_ACTIVE` (HTTP 200, `status: "active"`)

Print the standard report (below). No additional message.

### `REGISTRY_PENDING` (HTTP 200, `status: "pending"`)

Print the standard report, then add:

> "If you've already clicked the magic-link recently and still see *pending*, the link may have expired (the magic-link TTL is 1 hour). Run `/au:install` to request a fresh link."

### `REGISTRY_REVOKED` (HTTP 200, `status: "revoked"`)

Print the standard report, then add:

> "This agent has been revoked by the owner. Run `/au:install` to register a new agent for this workspace."

### `REGISTRY_RESET` (HTTP 200, `status: "reset"`)

Print the standard report, then add:

> "This agent has been reset by the owner. Run `/au:install` to register again."

### `IDENTITY_ORPHANED` (HTTP 404 / `not_found`)

The local identity refers to an install_id the backend doesn't recognise. Tell the human:

> "Local identity references an install_id the backend doesn't recognise (HTTP 404). Run `/au:install` — it will wipe the orphaned identity and register a new agent."

Do NOT auto-wipe identity.json from `/au:status` — let `/au:install` handle the cleanup so the user sees one cohesive prompt.

### `REMOTE_ERROR` (HTTP 5xx, network error)

Tell the human:

> "Couldn't reach Agent University (HTTP \<code\> or network error). Try again in a moment or check https://app.agentsuniversity.io."

## Standard status report

```
Agent University Status
─────────────────────
Agent ID:        <install_id>
Status:          <pending | active | revoked | reset>
Last extraction: <timestamp or "never">
Worldmodel entries: <count>
Dashboard:       https://app.agentsuniversity.io/agents/<install_id>
```

## Important

- The identity hash uses `sha256(absolute(cwd)).slice(0, 16)` — first 16 hex characters. Same truncation as `/au:install` and the implant runtime.
- Never auto-wipe identity.json from `/au:status`. State changes flow through `/au:install` only.
- The `pending → active` transition happens out-of-band (owner clicks magic-link). `/au:status` is a read-only diagnostic.

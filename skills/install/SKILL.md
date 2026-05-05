---
name: install
description: Register this workspace's agent with Agent University and set up identity. Handles fresh install, pending-resend, revoked/reset re-register, orphaned-local, and email-mismatch corner cases as an explicit state machine.
---

# /au:install — Register agent

You are setting up Agent University for this workspace. Follow the state machine below — each state has a distinct, well-defined action.

## Identity location

The identity file for this workspace lives at `~/.agent-university/projects/<hash>/identity.json` (mode 0600), where `<hash>` is `sha256(absolute(cwd))` **truncated to the first 16 hex characters** (matches the implementation in `agent-implant/src/lib/storage.ts`). Always compute the same truncation when reading or writing identity files.

## Step 1 — Resolve current state

1.1. Determine whether `~/.agent-university/projects/<hash>/identity.json` exists on disk.

1.2. If it exists, parse it and call the `agent_status` MCP tool (or, when MCP is unavailable, `GET ${AGENT_UNIVERSITY_BACKEND}/api/plugin/status` with headers `X-Install-Id: <stored install_id>` and `Authorization: Bearer <stored agent_key>`).

1.3. Compare `identity.owner_email` (if present) against `${AGENT_UNIVERSITY_EMAIL}`.

1.4. Map the (local, remote, email) tuple to exactly one named state from the table below.

| Local identity | Remote agent_status | Email match | State |
|---|---|---|---|
| absent | n/a | n/a | `IDENTITY_ABSENT` |
| present | 200 `active` | match | `REGISTRY_ACTIVE` |
| present | 200 `pending` | match | `REGISTRY_PENDING_RESEND` |
| present | 200 `revoked` | match | `REGISTRY_REVOKED` |
| present | 200 `reset` | match | `REGISTRY_RESET` |
| present | 404 / not_found | match | `IDENTITY_ORPHANED` |
| present | 5xx / network error | n/a | `REMOTE_ERROR` |
| present | any 200 | mismatch | `EMAIL_MISMATCH` |

The states above are exhaustive: every combination must resolve to one of them. Always print the resolved state name in your reasoning so the human can correlate the action to the diagnostic table.

## Step 2 — Action by state

### `IDENTITY_ABSENT` — fresh register

POST to `${AGENT_UNIVERSITY_BACKEND}/api/plugin/register` (or use `agent_register_url` MCP tool) with:

```json
{
  "install_id": "<generated UUID v4>",
  "owner_email": "${AGENT_UNIVERSITY_EMAIL}",
  "agent_platform": "claude-code",
  "plugin_version": "0.2.4"
}
```

Save `{install_id, agent_key, agent_status: "pending", owner_email}` to `~/.agent-university/projects/<hash>/identity.json` (mode 0600). Then tell the human:

> "I've registered this workspace with Agent University. Check **${AGENT_UNIVERSITY_EMAIL}** for the magic-link (subject *Activate your Agent University agent*). Click it within an hour, then run `/au:sync`."

### `REGISTRY_ACTIVE` — already active

Tell the human:

> "This workspace is already registered and active. Run `/au:sync` to extract a worldmodel."

Do not mutate identity.json or call `/api/plugin/register`.

### `REGISTRY_PENDING_RESEND` — pending; resend magic-link

The agent was registered earlier but the magic-link wasn't confirmed (the link may have expired — TTL is 1 hour). Re-POST to `${AGENT_UNIVERSITY_BACKEND}/api/plugin/register` with the **existing** `install_id` from identity.json:

```json
{
  "install_id": "<existing install_id from identity.json>",
  "owner_email": "${AGENT_UNIVERSITY_EMAIL}",
  "agent_platform": "claude-code",
  "plugin_version": "0.2.4"
}
```

The backend's `resend_pending` branch detects the duplicate install_id at `status='pending'`, calls `dispatchMagicLink({intent:'binding'})` with the same agent_id, and returns HTTP 200 `{agent_id, agent_key:null, status:"pending"}`. Backend rate-limits magic-link dispatch per email; do not retry in a loop.

Do NOT mutate identity.json — the existing `agent_key` is still valid.

Tell the human:

> "This workspace was registered earlier but the magic-link hasn't been confirmed yet. I've requested a fresh link for **${AGENT_UNIVERSITY_EMAIL}** (the previous one may have expired). Click it within an hour, then run `/au:sync`."

### `REGISTRY_REVOKED` — owner revoked the agent; re-register

The owner revoked this agent in the dashboard. Reusing the install_id is rejected by the backend (HTTP 409 `install_id_exists`). Wipe `~/.agent-university/projects/<hash>/identity.json`, then run the `IDENTITY_ABSENT` action with a freshly generated UUID v4 install_id.

Tell the human:

> "This agent was revoked by the owner. I've registered a new agent for this workspace. Check **${AGENT_UNIVERSITY_EMAIL}** for the activation link, click it within an hour, then run `/au:sync`."

### `REGISTRY_RESET` — owner reset the agent; re-register

The owner reset this agent in the dashboard. Reusing the install_id is rejected by the backend (HTTP 409 `install_id_exists`). Wipe `~/.agent-university/projects/<hash>/identity.json`, then run the `IDENTITY_ABSENT` action with a freshly generated UUID v4 install_id.

Tell the human:

> "This agent was reset by the owner. I've registered a new agent for this workspace. Check **${AGENT_UNIVERSITY_EMAIL}** for the activation link, click it within an hour, then run `/au:sync`."

### `IDENTITY_ORPHANED` — local present, remote 404

The local identity refers to an install_id the backend has no record of (manual deletion, sandbox wipe, environment switch). Wipe `~/.agent-university/projects/<hash>/identity.json`, then run the `IDENTITY_ABSENT` action.

Tell the human:

> "Local identity references an install_id the backend doesn't recognise. I've wiped it and registered a new agent. Check **${AGENT_UNIVERSITY_EMAIL}** for the activation link."

### `REMOTE_ERROR` — backend unreachable

Do NOT mutate any local state. Surface the error to the human:

> "Couldn't reach Agent University (HTTP \<status code\> or network error). Try `/au:install` again in a moment, or check https://app.agentsuniversity.io. Local identity is unchanged."

### `EMAIL_MISMATCH` — identity vs env config drift

The on-disk identity was registered for one email; `${AGENT_UNIVERSITY_EMAIL}` says another. This is a configuration drift — the human likely changed `userConfig.email` after a prior install, or moved the marketplace install between accounts. Do NOT auto-wipe (would silently abandon an existing real agent).

Tell the human:

> "The local identity for this workspace was registered for **${identity.owner_email}**, but the plugin is currently configured for **${AGENT_UNIVERSITY_EMAIL}**. Pick one path:
> 1. Update the plugin email back to **${identity.owner_email}** (in Claude Code marketplace plugin config), then re-run `/au:install`.
> 2. Wipe `~/.agent-university/projects/<hash>/` and re-run `/au:install` to register a brand-new agent for **${AGENT_UNIVERSITY_EMAIL}**."

## Important

- `identity.json` MUST be mode 0600 — it carries `agent_key` which is a per-agent bearer token.
- Identity hash is `sha256(absolute(cwd)).slice(0, 16)` — first 16 hex characters of the SHA-256 of the absolute (resolved) current working directory. Truncation is intentional (path-length friendly). The implant uses the same truncation in `agent-implant/src/lib/storage.ts`.
- Do NOT install from `$HOME` or `/` — those are not project directories; per-folder identity is meaningless there.
- Every state above resolves to a stable terminal action. Running `/au:install` twice in any state is safe and well-defined: the second call hits one of `REGISTRY_PENDING_RESEND`, `REGISTRY_ACTIVE`, or the appropriate fresh-register variant.
- The `pending → active` transition is owner-driven (clicking the magic-link). The skill cannot force it; it can only request a fresh link via `REGISTRY_PENDING_RESEND`.
- Backend rate-limits magic-link dispatch per email and per IP. Do not loop `/au:install` hoping to spam emails.

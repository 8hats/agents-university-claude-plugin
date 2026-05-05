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

1.2. Call the `agent_status` MCP tool to learn the remote state. (The MCP tool runs **inside** the implant process and has access to the plugin user_config — your bash shell does NOT, so do not try to read `${AGENT_UNIVERSITY_EMAIL}` or `${AGENT_UNIVERSITY_BACKEND}` from the shell.)

1.3. Map the (local, remote) tuple to exactly one named state from the table below.

| Local identity | Remote agent_status | State |
|---|---|---|
| absent | n/a | `IDENTITY_ABSENT` |
| present | 200 `active` | `REGISTRY_ACTIVE` |
| present | 200 `pending` | `REGISTRY_PENDING_RESEND` |
| present | 200 `revoked` | `REGISTRY_REVOKED` |
| present | 200 `reset` | `REGISTRY_RESET` |
| present | 404 / not_found | `IDENTITY_ORPHANED` |
| present | 5xx / network error | `REMOTE_ERROR` |

The states above are exhaustive: every combination must resolve to one of them. Always print the resolved state name in your reasoning so the human can correlate the action to the diagnostic table.

(Δ25 note — earlier SKILL versions distinguished an `EMAIL_MISMATCH` state by reading `${AGENT_UNIVERSITY_EMAIL}` from your bash shell. Claude Code does not propagate plugin user_config into bash; the env var is only available inside the implant MCP process. Email comparison happens server-side now: `/api/plugin/register` returns 409 if the install_id already exists for a different owner; the implant `agent_register_email` MCP tool surfaces that error code in its response.)

## Step 2 — Action by state

### `IDENTITY_ABSENT` — fresh register

Call the **`agent_register_email` MCP tool** with empty arguments `{}`. The implant reads `AGENT_UNIVERSITY_EMAIL` from its own env (set by Claude Code from `userConfig.email`), generates / reuses a fresh `install_id`, scans the workspace for `pathHint + fingerprint`, POSTs `/api/plugin/register`, persists `~/.agent-university/projects/<hash>/identity.json`, and returns:

```json
{
  "outcome": "registered_pending",
  "install_id": "<uuid>",
  "owner_email": "<the email>",
  "status": "pending",
  "message": "Registered. Open the magic-link we just emailed to <email>, then run /au:sync.",
  "workspace_path_hint": "<basename(cwd)>"
}
```

Echo the `message` field verbatim to the human.

If the tool returns an error like `AGENT_UNIVERSITY_EMAIL is not set ...`, that means the user did not enter an email when installing the plugin (or chose to skip it). Tell them to re-run `/plugin install au@8hats-agents-university-claude-plugin` and enter their email when prompted.

### `REGISTRY_ACTIVE` — already active

Tell the human:

> "This workspace is already registered and active. Run `/au:sync` to extract a worldmodel."

Do not call any registration tool. Do not mutate identity.json.

### `REGISTRY_PENDING_RESEND` — pending; resend magic-link

The agent was registered earlier but the magic-link wasn't confirmed (the link may have expired — TTL is 1 hour). Call the **`agent_register_email` MCP tool** with empty arguments `{}`. The implant detects the existing pending install_id, hits the backend's `resend_pending` branch, returns:

```json
{
  "outcome": "resent_pending",
  "install_id": "<existing-uuid>",
  "owner_email": "<the email>",
  "status": "pending",
  "message": "Magic-link re-sent to <email>. Click it within an hour, then run /au:sync.",
  "workspace_path_hint": "<basename(cwd)>"
}
```

The implant preserves the existing `agent_key` in identity.json (the backend returns `agent_key:null` on resend; the local key is still valid). Echo the `message` field to the human. Backend rate-limits magic-link dispatch per email; do not loop `/au:install`.

### `REGISTRY_REVOKED` — owner revoked the agent; re-register

The owner revoked this agent in the dashboard. Reusing the install_id is rejected by the backend (HTTP 409 `install_id_exists`). Wipe `~/.agent-university/projects/<hash>/identity.json`, then call `agent_register_email` (which generates a fresh UUID since identity is now absent).

Tell the human:

> "This agent was revoked by the owner. I've registered a new agent for this workspace. Open the activation link in your email, then run `/au:sync`."

### `REGISTRY_RESET` — owner reset the agent; re-register

The owner reset this agent in the dashboard. Reusing the install_id is rejected by the backend (HTTP 409 `install_id_exists`). Wipe `~/.agent-university/projects/<hash>/identity.json`, then call `agent_register_email`.

Tell the human:

> "This agent was reset by the owner. I've registered a new agent for this workspace. Open the activation link in your email, then run `/au:sync`."

### `IDENTITY_ORPHANED` — local present, remote 404

The local identity refers to an install_id the backend has no record of (manual deletion, sandbox wipe, environment switch). Wipe `~/.agent-university/projects/<hash>/identity.json`, then call `agent_register_email`.

Tell the human:

> "Local identity references an install_id the backend doesn't recognise. I've wiped it and registered a new agent. Open the activation link in your email, then run `/au:sync`."

### `REMOTE_ERROR` — backend unreachable

Do NOT mutate any local state. Surface the error to the human:

> "Couldn't reach Agent University (HTTP \<status code\> or network error). Try `/au:install` again in a moment, or check https://app.agentsuniversity.io. Local identity is unchanged."

## Important

- `identity.json` MUST be mode 0600 — it carries `agent_key` which is a per-agent bearer token. The `agent_register_email` MCP tool writes it with the correct mode; do not write it manually from the SKILL.
- Identity hash is `sha256(absolute(cwd)).slice(0, 16)` — first 16 hex characters of the SHA-256 of the absolute (resolved) current working directory. Truncation is intentional (path-length friendly). The implant uses the same truncation in `agent-implant/src/lib/storage.ts`.
- Do NOT install from `$HOME` or `/` — those are not project directories; per-folder identity is meaningless there.
- Every state above resolves to a stable terminal action. Running `/au:install` twice in any state is safe and well-defined: the second call hits one of `REGISTRY_PENDING_RESEND`, `REGISTRY_ACTIVE`, or the appropriate fresh-register variant.
- The `pending → active` transition is owner-driven (clicking the magic-link). The skill cannot force it; it can only request a fresh link via `REGISTRY_PENDING_RESEND`.
- Backend rate-limits magic-link dispatch per email and per IP. Do not loop `/au:install` hoping to spam emails.
- **Δ25 invariant**: registration goes through the `agent_register_email` MCP tool, never through raw `curl`/`fetch` from the SKILL bash. The MCP tool has the plugin user_config; the bash shell does not.

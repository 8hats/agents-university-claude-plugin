---
name: install
description: Register this workspace's agent with Agent University and set up identity
---

# /au:install — Register agent

You are setting up Agent University for this workspace.

## What you will do

1. Compute a per-folder identity hash from the current working directory.
2. Check if `~/.agent-university/projects/<hash>/identity.json` already exists.
   - If it exists AND `GET ${AGENT_UNIVERSITY_BACKEND}/api/plugin/me` returns 200 with the stored `agent_key` → reuse the existing identity. Tell the human: "This workspace is already registered. Run `/au:sync` to extract a worldmodel."
   - If it doesn't exist → continue to step 3.
3. Read the email from `AGENT_UNIVERSITY_EMAIL` environment variable.
4. Call the MCP tool `agent_register_url` to get the registration endpoint, OR directly POST to `${AGENT_UNIVERSITY_BACKEND}/api/plugin/register` with:
   ```json
   {
     "install_id": "<generated-uuid-v4>",
     "owner_email": "<email from env>",
     "agent_platform": "claude-code",
     "plugin_version": "0.1.0"
   }
   ```
5. On success, save `{ install_id, agent_key, agent_status: "pending" }` to `~/.agent-university/projects/<hash>/identity.json` (mode 0600).
6. Tell the human:
   > "I've registered this workspace with Agent University. Check your email for a confirmation link from Agent University. Click it, then come back and run `/au:sync` to extract your workspace worldmodel."

## Important

- The identity hash is `sha256(cwd)` — each project folder gets its own agent.
- Do NOT install from `$HOME` or `/` — these are not project directories.
- `identity.json` must be mode 0600 (contains `agent_key`).
- This operation is idempotent — running it twice on the same folder reuses the identity.

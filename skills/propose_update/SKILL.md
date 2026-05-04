---
name: propose_update
description: Send a curated reflection from this workspace to the owner for review and approval
---

# /au:propose_update — Send a reflection to the owner for review

You are submitting a previously-written curated reflection (see `/au:reflect`) to the
agent owner for review. Approving the proposal updates the org worldmodel for this
agent and every other agent owned by the same owner.

## What you will do

1. Choose the curated reflection file to submit. By default this is the most recent
   file under `runtime/memory/episodic/curated/`.
2. Call the MCP tool `propose_update.send` with:
   ```json
   {
     "agent_id": "<this workspace's install_id>",
     "curated_filename": "runtime/memory/episodic/curated/<ts>.md"
   }
   ```
3. The tool reads the curated file, validates frontmatter, reads the local
   `worldmodel.md` to extract `parent_version_int`, and POSTs to
   `${AGENT_UNIVERSITY_BACKEND}/api/plugin/proposals`.
4. On success the tool returns:
   ```json
   { "status": "submitted", "proposal_id": "<uuid>", "parent_version_int": <int> }
   ```
   Tell the human:
   > "Proposal `<proposal_id>` submitted for review against version
   > `<parent_version_int>`. The owner will see it in the dashboard at
   > `/agents/<install_id>/proposals`."

## Errors and next steps

- **`stale_parent`** — your local `worldmodel.md` is behind the org master. The next
  user prompt or session start automatically fetches the new version via the
  polling-fallback hook. Once your local `worldmodel.md` updates, run `/au:reflect`
  again against the new context and re-run `/au:propose_update`.
- **`upgrade_required`** (HTTP 426) — the plugin is older than the server's
  `MIN_PLUGIN_VERSION`. Tell the human to update via the printed `upgrade_url`.
- **`not_curated`** — you tried to submit a file outside
  `runtime/memory/episodic/curated/`. The tool refuses for safety; this guard
  preserves the raw-never-travels invariant.
- **`network_error`** — transient. Retry; if it persists, ask the operator to
  check the platform.

## Important

- Only `entries[]` from the curated file travel to the platform. The raw transcript
  body never leaves the agent's home folder.
- Submitting a proposal does NOT mutate the worldmodel until the owner approves it
  in the dashboard. Until then the proposal lives as `pending_review`.
- The MCP tool reads `parent_version_int` from the local `worldmodel.md` header — if
  the file is missing or malformed, the tool returns `worldmodel_unreadable`.

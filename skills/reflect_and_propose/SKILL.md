---
name: reflect_and_propose
description: Capture a curated reflection and immediately submit it to the owner for review
---

# /au:reflect_and_propose — Reflect, then submit

Use this convenience command when the human wants one step instead of running
`/au:reflect` and `/au:propose_update` separately. It does not add a new MCP
tool; it calls the existing tools in sequence.

## What you will do

1. Build the same curated reflection payload described by `/au:reflect`:
   - `summary` is one short sentence.
   - `entries[]` are structured and curated, not raw transcript dumps.
   - each entry has `label`, `value`, and `kind`.
2. Call `reflect.start`:
   ```json
   {
     "agent_id": "<this workspace's install_id>",
     "source_session_id": "<current session id or stable per-session token>",
     "summary": "<one-sentence summary>",
     "entries": [],
     "body_md": "<optional free-text body>"
   }
   ```
3. If `reflect.start` succeeds, call `propose_update.send` with the returned
   curated filename:
   ```json
   {
     "agent_id": "<this workspace's install_id>",
     "curated_filename": "runtime/memory/episodic/curated/<ts>.md"
   }
   ```
4. On success, tell the human:
   > "Reflection written and proposal `<proposal_id>` submitted for review
   > against version `<parent_version_int>`."

## Errors and next steps

- If `reflect.start` fails, stop and surface that typed error. Do not call
  `propose_update.send`.
- If `propose_update.send` returns `stale_parent`, tell the human that local
  `worldmodel.md` is behind the org master and will be refreshed by the next
  polling hook. They should re-run `/au:reflect_and_propose` after refresh.
- If `propose_update.send` returns `upgrade_required` (HTTP 426), tell the human
  to update from the returned `upgrade_url`.
- If either tool returns `network_error`, retry once only if the human asks.

## Important

- Raw transcript content must never leave the agent home folder.
- The proposal does not mutate the org worldmodel until the owner approves it.
- Power users can still run `/au:reflect` first, inspect the curated file, and
  then run `/au:propose_update`.

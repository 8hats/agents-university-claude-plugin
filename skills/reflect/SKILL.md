---
name: reflect
description: Capture a curated reflection of what you've learned this session into the agent's local memory
---

# /au:reflect — Capture a curated reflection

You are about to record a curated reflection of what you have learned in this session
into the agent's local memory. The reflection lands on disk only — it does NOT change
the org-level worldmodel until you also run `/au:propose_update`.

## What you will do

1. Summarise the session in one short sentence (≤ 280 chars). Examples:
   - "Discovered the auth layer is shared between admin and tenant APIs."
   - "User confirmed the CSV import job is the production bottleneck."
2. Extract structured `entries[]` from the session — each entry MUST include:
   - `label` — short identifier (≤ 128 chars).
   - `value` — the content of the entry (≤ 4096 chars).
   - `kind` — one of `belief`, `focus`, `alignment`, `profile`, `free`.
3. Call the MCP tool `reflect.start` with:
   ```json
   {
     "agent_id": "<this workspace's install_id>",
     "source_session_id": "<current session id or stable per-session token>",
     "summary": "<one-sentence summary>",
     "entries": [ /* the structured entries above */ ],
     "body_md": "<optional free-text body>"
   }
   ```
4. The tool writes `runtime/memory/episodic/curated/{ts}.md` atomically and returns
   `{ status: "written", path, ts }`. Tell the human:
   > "I've written the reflection to <path>. Run `/au:propose_update` if you want
   > to send it to the owner for review."

## Important

- The reflection is curated content — it MUST NOT contain raw transcript dumps.
  Summarise; do not paste.
- The MCP tool refuses to write outside `runtime/memory/episodic/curated/` — if
  the path resolves outside of that, that is a bug, not a permission error.
- Reflection is purely local. It does NOT call the platform.
- The reflection has no effect on the org-level worldmodel until `/au:propose_update`
  reads it back and POSTs `entries[]` to `POST /api/plugin/proposals`.

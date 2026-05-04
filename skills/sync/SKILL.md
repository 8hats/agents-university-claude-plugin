---
name: sync
description: Extract workspace worldmodel and push it to Agent University. Handles pending (with resend-hint via /au:install), revoked, and identity-absent corner cases.
---

# /au:sync — Extract and push worldmodel

You are extracting a worldmodel from this workspace and pushing it to Agent University.

## Prerequisites

- `/au:install` must have been run first (identity.json must exist).
- The human must have clicked the confirmation email so `agent_status` is `active`.

## What you will do

1. Check that `~/.agent-university/projects/<hash>/identity.json` exists. The hash is `sha256(absolute(cwd))` truncated to the first 16 hex characters (matches `agent-implant/src/lib/storage.ts`).
   - If absent → state `IDENTITY_ABSENT`. Tell the human: "This workspace isn't registered. Run `/au:install` first." Stop here.
2. Call the MCP tool `workspace_scan` provided by the implant MCP server. It validates registration with the platform and returns the raw context files (CLAUDE.md, AGENTS.md, README.md, .cursorrules, memory/) plus their coverage report.
   - If the tool replies that the agent is `pending` → state `REGISTRY_PENDING`. Follow the *If agent status is pending* branch below and stop.
   - If the tool replies that the agent is `revoked` → state `REGISTRY_REVOKED`. Follow the *If agent status is revoked* branch below and stop.
   - If the tool replies that the agent is `reset` → same handling as revoked, with "reset" wording.
3. Read the returned files and extract semantic facts. Each fact becomes one entry with `label`, `value`, `confidence` (0–100), and a discriminator `kind` from `belief | focus | alignment | profile | free`. Use `is_warning: true` for gaps the owner should address. Recommended belief/focus categories: Workspace Role, Tech Stack, Architecture, Conventions, Dependencies, Testing Strategy, Deployment, Team Structure, Key Decisions, Constraints.
4. Worldmodel-MVP requires exactly two alignment entries — one ALIGNMENT_ENV (mother_of_space) and one ALIGNMENT_GOV (governor) — both with `kind: "alignment"` and a **prefixed slug** as `value` per `contracts/plugin/alignment-options.md`: ALIGNMENT_ENV MUST be one of `mother_of_space.option_1` .. `mother_of_space.option_5`; ALIGNMENT_GOV MUST be one of `governor.option_1` .. `governor.option_5`. The bare archetype names (Boundless / Clarity / Fertility / Warmth / Swiftness for the env dimension; Space / Mirror / Generosity / Discernment / Action for the gov dimension) are human-facing display labels only — they are **not** legal wire values; the C0 validator rejects them with HTTP 400 `alignment_missing` and first `/au:sync` materialisation breaks.
5. Call the MCP tool `submit_worldmodel` with `{ entries: [...] }`. The implant handles the full extraction-run pipeline (open run → scan/extract/submit step updates → POST result) and writes the local `worldmodel.md` mirror when the platform returns the additive C0 fields.
6. Report the result to the human: the version number, number of entries submitted, and the dashboard URL returned by `submit_worldmodel`.

## If agent status is pending

Tell the human:

> "Your agent is still pending confirmation. Check **${AGENT_UNIVERSITY_EMAIL}** for the magic-link from Agent University and click it. If the link is older than an hour or you've lost the email, run `/au:install` to request a fresh link, then retry `/au:sync`."

Note the explicit `/au:install` recommendation: the install skill's `REGISTRY_PENDING_RESEND` branch handles the resend cleanly.

## If agent status is revoked

Tell the human:

> "This agent was revoked by the owner. Run `/au:install` to register a new agent for this workspace, click the activation link, then `/au:sync` again."

## Important

- Do NOT attempt manual file scanning over the platform HTTP API — the two MCP tools are the only sanctioned surface for this skill.
- `workspace_scan` returns content for you to interpret; `submit_worldmodel` posts your interpretation. Run them in this order, in the same session, so the implant can correlate the workspace fingerprint with the extraction run.
- The extraction may take 30–60 seconds depending on workspace size.
- `/au:sync` is read-only with respect to identity.json — it never wipes or rewrites it. State changes (e.g. on revoked) flow through `/au:install` only.

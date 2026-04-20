---
name: sync
description: Extract workspace worldmodel and push it to Agent University
---

# /au:sync — Extract and push worldmodel

You are extracting a worldmodel from this workspace and pushing it to Agent University.

## Prerequisites

- `/au:install` must have been run first (identity.json must exist).
- The human must have clicked the confirmation email (agent status must be `active`).

## What you will do

1. Check that `~/.agent-university/projects/<hash>/identity.json` exists. If not, tell the human to run `/au:install` first.
2. Call the MCP tool `agent_sync` provided by the implant MCP server. This tool handles the full extraction pipeline:
   - Opens an extraction run
   - Scans workspace files (CLAUDE.md, .cursorrules, memory/, README.md, etc.)
   - Posts step updates
   - Submits the worldmodel result
3. Report the result to the human: number of entries extracted, and the dashboard URL where they can view the worldmodel.

## If agent status is pending

Tell the human:
> "Your agent is still pending confirmation. Check your email for a link from Agent University and click it. Then try `/au:sync` again."

## Important

- Do NOT attempt manual file scanning — the `agent_sync` MCP tool handles everything.
- The extraction may take 30–60 seconds depending on workspace size.

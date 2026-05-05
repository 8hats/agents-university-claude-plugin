/**
 * RT-Δ25-A — /au:install SKILL drives registration through the MCP tool,
 * not raw HTTP from bash.
 *
 * The original SKILL design read AGENT_UNIVERSITY_EMAIL from the bash
 * shell and POSTed /api/plugin/register directly. That env var is set
 * by Claude Code only inside the implant MCP server process — the SKILL's
 * bash shell does NOT see it. So /au:install would silently fail with
 * EMAIL=<unset> whenever Claude Code's user_config propagation lapsed.
 *
 * Δ25 fix: register goes through the `agent_register_email` MCP tool which
 * runs INSIDE the implant process (where the env always is). This static
 * test pins that invariant so a future contributor can't quietly revert
 * to raw POST from bash.
 *
 * Spec: docs/proposals-alignment-review-post-a3.md §4d (Δ25).
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SKILL_PATH = join(__dirname, '..', '..', 'skills', 'install', 'SKILL.md')

describe('RT-Δ25-A — /au:install SKILL uses MCP tool, not bash env', () => {
  it('IDENTITY_ABSENT path calls agent_register_email MCP tool', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    // The tool name appears in the IDENTITY_ABSENT section.
    const absentSection = src.split('### `IDENTITY_ABSENT`')[1]?.split('### `')[0] ?? ''
    expect(absentSection).toMatch(/agent_register_email/)
  })

  it('REGISTRY_PENDING_RESEND path calls agent_register_email MCP tool', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    const resendSection = src.split('### `REGISTRY_PENDING_RESEND`')[1]?.split('### `')[0] ?? ''
    expect(resendSection).toMatch(/agent_register_email/)
  })

  it('SKILL forbids reading AGENT_UNIVERSITY_EMAIL from bash', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    // Direct curl/POST instructions reading shell env are the bug.
    // The SKILL must instruct calling the MCP tool — never:
    //   - reading owner_email from `${AGENT_UNIVERSITY_EMAIL}`
    //     for the purpose of building a register payload
    //   - hardcoding plugin_version (the implant uses its compile-time const)
    expect(src).not.toMatch(/owner_email["'\s:]*["']\$\{AGENT_UNIVERSITY_EMAIL\}["']/)
    expect(src).not.toMatch(/plugin_version["'\s:]*["']0\.1\.0["']/)
    // Documentation lines may reference the env var name (e.g. "Claude Code
    // does not propagate ${AGENT_UNIVERSITY_EMAIL} into bash"), but that's
    // explanatory text. The forbidden pattern is using it AS THE SOURCE
    // OF TRUTH inside a register payload — pinned by the regex above.
  })

  it('SKILL forbids raw curl/fetch register from bash (Δ25 invariant)', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    // No `curl ... /api/plugin/register` instructions.
    expect(src).not.toMatch(/curl[^\n]*\/api\/plugin\/register/)
    // No `fetch(...)` or `POST` instructions for register that read shell env.
    // (We allow reference to `/api/plugin/register` in prose since it explains
    // what the MCP tool does internally.)
    expect(src).not.toMatch(/POST[^\n]+\$\{AGENT_UNIVERSITY_EMAIL\}/)
  })
})

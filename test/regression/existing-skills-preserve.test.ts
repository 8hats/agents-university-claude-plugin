/**
 * RT-014 — existing /au:install + /au:sync SKILL.md byte-unchanged.
 *
 * Asserts that the v0.2.0 release does not modify the existing two skills
 * (apart from the plugin.json version bump exercised elsewhere). The
 * worldmodel-mvp slice is purely additive.
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SKILLS = join(__dirname, '..', '..', 'skills')

describe('RT-014 — existing skills preserved', () => {
  it('install skill exists and references the MCP-tool register flow (Δ25)', async () => {
    const src = await readFile(SKILLS + '/install/SKILL.md', 'utf8')
    expect(src).toContain('install_id')
    // /api/plugin/me was never implemented; guard against the stale probe.
    expect(src).not.toMatch(/\/api\/plugin\/me\b/)
    // Δ25 — register goes through the agent_register_email MCP tool; raw
    // POST from bash is forbidden (the SKILL shell does NOT see plugin
    // user_config env vars). RT-Δ25-A pins this invariant directly.
    expect(src).toContain('agent_register_email')
    // The implant constructs the register payload now; the SKILL must NOT
    // hardcode plugin_version (would drift from the implant's version
    // constant, breaking the 426 gate or sending stale metadata).
    expect(src).not.toMatch(/plugin_version["'\s:]*["']0\.1\.0["']/)
    expect(src).not.toMatch(/plugin_version["'\s:]*["']0\.2\.[0-9]+["']/)
  })

  it('sync skill exists and references the documented shipped MCP tool surface', async () => {
    const src = await readFile(join(SKILLS, 'sync', 'SKILL.md'), 'utf8')
    expect(src.length).toBeGreaterThan(0)
    expect(src.startsWith('---\n')).toBe(true)
    // README.md:101 + contracts/README.md slash-command map bind /au:sync to
    // workspace_scan + submit_worldmodel. agent_sync was never registered by
    // the implant (server.ts:46-144) — guard against the stale name reappearing.
    expect(src).toContain('workspace_scan')
    expect(src).toContain('submit_worldmodel')
    expect(src).not.toMatch(/\bagent_sync\b/)
  })

  it('status skill exists', async () => {
    const src = await readFile(join(SKILLS, 'status', 'SKILL.md'), 'utf8')
    expect(src.length).toBeGreaterThan(0)
    expect(src.startsWith('---\n')).toBe(true)
  })

  it('plugin.json carries version 0.2.6', async () => {
    const path = join(__dirname, '..', '..', '.claude-plugin', 'plugin.json')
    const json = JSON.parse(await readFile(path, 'utf8'))
    expect(json.version).toBe('0.2.6')
  })
})

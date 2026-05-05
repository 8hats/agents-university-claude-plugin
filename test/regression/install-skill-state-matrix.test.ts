/**
 * RT-INSTALL-STATES — install/SKILL.md state machine completeness.
 *
 * /au:install must navigate (local identity, remote agent_status, email
 * match) as an explicit state machine. Each state below has a distinct
 * action and a distinct human-facing message. Missing any one state is a
 * regression — Claude silently falls through to a default that does not
 * match the user's situation (the v0.2.0..0.2.2 pending-not-resending bug
 * is the canonical example).
 *
 * The skill MUST contain every state name as text (Claude reads it like
 * documentation) AND each state's action MUST mention the operations the
 * action depends on (POST /register for fresh + resend, identity wipe for
 * revoked/reset/orphaned, etc).
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SKILL_PATH = join(__dirname, '..', '..', 'skills', 'install', 'SKILL.md')

// Δ25 — EMAIL_MISMATCH was removed from the SKILL state machine because
// detecting it requires the SKILL to read AGENT_UNIVERSITY_EMAIL, which
// Claude Code does not propagate into the SKILL bash. Email mismatch now
// surfaces server-side: /api/plugin/register returns 409 install_id_exists
// when the install_id already belongs to a different owner; the implant's
// agent_register_email MCP tool surfaces that error to the SKILL.
const STATES = [
  'IDENTITY_ABSENT',
  'REGISTRY_ACTIVE',
  'REGISTRY_PENDING_RESEND',
  'REGISTRY_REVOKED',
  'REGISTRY_RESET',
  'IDENTITY_ORPHANED',
  'REMOTE_ERROR',
] as const

describe('RT-INSTALL-STATES — install/SKILL.md state machine completeness', () => {
  for (const state of STATES) {
    it(`declares the ${state} branch`, async () => {
      const src = await readFile(SKILL_PATH, 'utf8')
      // The state name must appear at least twice — once in the resolution
      // table (state column) and once as the action's section heading.
      const matches = (src.match(new RegExp(state, 'g')) ?? []).length
      expect(matches).toBeGreaterThanOrEqual(2)
    })
  }

  it('REGISTRY_PENDING_RESEND action calls agent_register_email MCP tool (Δ25)', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    const idx = src.indexOf('REGISTRY_PENDING_RESEND')
    expect(idx).toBeGreaterThan(0)
    const next = src.indexOf('### `REGISTRY_REVOKED`', idx)
    const action = src.slice(idx, next > 0 ? next : src.length)
    expect(action).toMatch(/agent_register_email/)
    // The MCP tool, not the SKILL, is responsible for preserving the
    // existing agent_key; the SKILL must NOT instruct manual identity
    // surgery here.
    expect(action).toMatch(/(preserve|existing.*agent_key|implant)/i)
  })

  it('REGISTRY_REVOKED and REGISTRY_RESET wipe local identity before re-register (Δ25)', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    for (const state of ['REGISTRY_REVOKED', 'REGISTRY_RESET'] as const) {
      const idx = src.indexOf(`### \`${state}\``)
      expect(idx).toBeGreaterThan(0)
      const next = src.indexOf('### `', idx + 5)
      const action = src.slice(idx, next > 0 ? next : src.length)
      expect(action).toMatch(/(wipe|delete|remove).*identity\.json/i)
      // Δ25: the MCP tool generates the fresh UUID once identity is wiped.
      expect(action).toMatch(/agent_register_email/)
    }
  })

  it('REMOTE_ERROR explicitly leaves local state unchanged', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    const idx = src.indexOf('### `REMOTE_ERROR`')
    expect(idx).toBeGreaterThan(0)
    // REMOTE_ERROR is the LAST state section.
    const action = src.slice(idx)
    expect(action).toMatch(/(do not mutate|do not.*wipe|unchanged)/i)
  })

  it('identity hash truncation to 16 hex chars is documented', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    expect(src).toMatch(/sha256\(absolute\(cwd\)\)/)
    expect(src).toMatch(/(slice\(0,\s*16\)|first 16 hex|truncated to.*16)/i)
  })

  it('the action sections fully cover the resolution table (no orphan states)', async () => {
    const src = await readFile(SKILL_PATH, 'utf8')
    // Pull each state name from the resolution table column and assert that
    // a corresponding "### `STATE_NAME` —" action section exists.
    for (const state of STATES) {
      const headingPattern = new RegExp(`### \`${state}\``)
      expect(src).toMatch(headingPattern)
    }
  })
})

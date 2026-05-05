/**
 * Smoke guard for Claude Code marketplace installation.
 *
 * Claude Code validates `.claude-plugin/marketplace.json` before it can even
 * list or install `au`. A repo-local plugin list without top-level marketplace
 * metadata fails with "name: expected string" / "owner: expected object".
 */
import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PLUGIN_ROOT = join(__dirname, '..', '..')
const CLAUDE_PLUGIN = join(PLUGIN_ROOT, '.claude-plugin')

async function readJson(path: string): Promise<Record<string, any>> {
  return JSON.parse(await readFile(path, 'utf8'))
}

describe('Claude Code marketplace schema smoke', () => {
  it('marketplace.json has required top-level marketplace metadata', async () => {
    const marketplace = await readJson(join(CLAUDE_PLUGIN, 'marketplace.json'))

    expect(marketplace.name).toBe('8hats-agents-university-claude-plugin')
    expect(marketplace.owner).toMatchObject({
      name: '8Hats Lab',
      email: 'id@8hats.ai',
    })
    expect(Array.isArray(marketplace.plugins)).toBe(true)
    expect(marketplace.plugins).toHaveLength(1)
  })

  it('marketplace entry points at the local plugin root', async () => {
    const marketplace = await readJson(join(CLAUDE_PLUGIN, 'marketplace.json'))
    const [entry] = marketplace.plugins

    expect(entry).toMatchObject({
      name: 'au',
      version: '0.2.4',
      source: './',
      category: 'productivity',
    })
  })

  it('plugin userConfig.email is valid for Claude Code prompts', async () => {
    const plugin = await readJson(join(CLAUDE_PLUGIN, 'plugin.json'))

    expect(plugin.userConfig.email).toMatchObject({
      type: 'string',
      title: 'Email address',
      description: 'Your email address (for magic-link confirmation)',
      sensitive: false,
      required: true,
    })
  })
})

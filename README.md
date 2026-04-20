# Agent University — Claude Code Plugin

Claude Code plugin for [Agent University](https://agentsuniversity.io). Registers your coding agent's workspace and extracts a worldmodel that workspace owners can inspect.

## Install

```
/plugin marketplace add agentsuniversity/claude-plugin
/plugin install au@agentsuniversity-claude-plugin
```

Claude Code will ask for your email address during installation.

## Skills

| Skill | Description |
|-------|-------------|
| `/au:install` | Register this workspace with Agent University |
| `/au:sync` | Extract workspace worldmodel and push to dashboard |
| `/au:status` | Check registration status |

## How it works

1. `/au:install` registers your workspace and sends a confirmation email
2. Click the link in the email to confirm
3. `/au:sync` scans your workspace and extracts a worldmodel
4. View your worldmodel at `https://app.agentsuniversity.io/agents/<id>`

## License

BSL-1.1

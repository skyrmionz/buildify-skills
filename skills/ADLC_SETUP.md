# Agentforce ADLC Integration

The Buildify integrates with [Agentforce ADLC](https://github.com/almandsky/agentforce-adlc) — a Claude Code skill suite for the full Agentforce agent development lifecycle.

## Installation

```bash
python3 -c "import urllib.request; urllib.request.urlretrieve('https://raw.githubusercontent.com/almandsky/agentforce-adlc/main/tools/install.py', '/tmp/adlc-install.py')" && python3 /tmp/adlc-install.py
```

## When to Use ADLC vs Buildify MCP

| Task | Tool |
|---|---|
| Writing demo notes, storyboard, script | Buildify MCP tools |
| Managing org config items and to-dos | Buildify MCP tools |
| Creating Agentforce agent `.agent` files | `/adlc-author` |
| Discovering existing org targets | `/adlc-discover` |
| Generating Flow/Apex stubs | `/adlc-scaffold` |
| Deploying + activating agents | `/adlc-deploy` |
| Testing agent behavior | `/adlc-test` |
| Optimizing from STDM traces | `/adlc-optimize` |
| Safety/compliance review | `/adlc-safety` |
| Recording build results back to app | `record_agentforce_build()` MCP tool |

## Integrated Workflow

1. Use Buildify MCP to plan the demo (Notes + Storyboard + Script)
2. In Org Config, define what Agentforce agent to build
3. Use `/adlc-author` to generate the `.agent` file from requirements
4. Use `/adlc-discover` to check what targets already exist
5. Use `/adlc-scaffold` to generate missing Flow XML / Apex stubs
6. Use `sf_deploy` (MCP tool) to deploy prerequisites
7. Use `/adlc-deploy` to publish and activate the agent
8. Use `record_agentforce_build(name, path, "deployed")` to update Org Config
9. Use `/adlc-test` to verify agent behavior
10. Use `/adlc-optimize` to improve based on session traces

## Prerequisites

- Python 3.8+
- Salesforce CLI (`sf`) authenticated to target org
- ADLC installed via the command above

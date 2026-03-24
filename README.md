# Buildify MCP Server

Connect any AI coding agent to your [Buildify](https://demo-building-app-f0300aa3e343.herokuapp.com) demo workspace. Your agent gets 41 tools to read, write, and navigate every tab — changes show up live on your screen.

Works with **Claude Desktop**, **Claude Code**, **Cursor**, **Windsurf**, **Codex**, **Cline**, and any MCP-compatible tool.

## Setup (2 minutes)

### 1. Get your token

Sign in to [Buildify](https://demo-building-app-f0300aa3e343.herokuapp.com), open the agent CLI drawer at the bottom, type `sync agent`, pick a project, and copy the token + config it gives you.

### 2. Install & configure your agent

#### Claude Code (Terminal)

```bash
git clone https://github.com/skyrmionz/buildify-skills.git
cd buildify-skills && npm install && npm run build

claude mcp add buildify \
  -e DEMO_TOOL_TOKEN=<your-token> \
  -e APP_URL=https://demo-building-app-f0300aa3e343.herokuapp.com \
  -- node $(pwd)/dist/index.js
```

Verify: `claude mcp list` should show `buildify: ✓ Connected`.

#### Claude Desktop

Clone and build (same as above), then add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "buildify": {
      "command": "node",
      "args": ["/path/to/buildify-skills/dist/index.js"],
      "env": {
        "DEMO_TOOL_TOKEN": "<your-token>",
        "APP_URL": "https://demo-building-app-f0300aa3e343.herokuapp.com"
      }
    }
  }
}
```

Restart Claude Desktop. Look for the hammer icon.

#### Cursor

Clone and build, then add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "buildify": {
      "command": "node",
      "args": ["/path/to/buildify-skills/dist/index.js"],
      "env": {
        "DEMO_TOOL_TOKEN": "<your-token>",
        "APP_URL": "https://demo-building-app-f0300aa3e343.herokuapp.com"
      }
    }
  }
}
```

#### Any other MCP-compatible agent

The server uses **stdio transport**. Point your agent at `node /path/to/buildify-skills/dist/index.js` with the two env vars below.

### 3. Add ADLC skills (optional — for Agentforce development)

If you're building Agentforce agents, install [agentforce-adlc](https://github.com/almandsky/agentforce-adlc) to give your agent the full Agent Development Life Cycle — author, discover, scaffold, deploy, test, and optimize `.agent` files directly from your coding agent.

```bash
curl -sSL https://raw.githubusercontent.com/almandsky/agentforce-adlc/main/tools/install.sh | bash
```

This installs 8 skills (`/adlc-author`, `/adlc-discover`, `/adlc-scaffold`, `/adlc-deploy`, `/adlc-run`, `/adlc-test`, `/adlc-optimize`, `/adlc-safety`) that work alongside the Buildify MCP tools. Use `record_agentforce_build` to log builds back to the app.

**Requires**: Python 3.9+, Salesforce CLI (`sf`) authenticated to your org.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEMO_TOOL_TOKEN` | Yes | Agent token generated from the Buildify CLI drawer |
| `APP_URL` | Yes | `https://demo-building-app-f0300aa3e343.herokuapp.com` |

Tokens expire after **24 hours**. Generate a new one from the CLI drawer when needed.

## What your agent can do

### Navigate the UI
- `navigate_to_tab` — Switch the user's screen to any tab

### Notes
- `read_demo_notes` — Read notes (Tiptap JSON)
- `write_demo_notes` — Write/replace notes

### Storyboard
- `get_storyboard` — Get all beats
- `add_storyboard_beat` — Add a beat
- `update_storyboard_beat` — Edit a beat's title, description, or image
- `delete_storyboard_beat` — Remove a beat
- `reorder_storyboard` — Reorder beats

### Script
- `get_script` — Get columns and rows
- `add_script_row` / `update_script_row` / `delete_script_row` — Manage rows
- `add_script_column` / `delete_script_column` — Manage columns

### Org Config
- `get_org_config` — Get all config items
- `add_org_config_item` / `update_org_config_item` / `delete_org_config_item` — Manage to-dos, docs, build data
- `get_org_details` / `update_org_details` — Read/write org credentials (username, password, org ID, alias)
- `record_agentforce_build` — Log an Agentforce build

### Video
- `get_video_config` — Read voice recordings, screen captures, video status
- `update_video_config` — Update video configuration

### Context
- `get_current_demo` — Full demo state (all tabs) fresh from DB
- `get_tab_content` — Read one tab (lighter)
- `update_demo_title` — Rename the demo project
- `flush_and_read` — Force-save user's pending edits, then return the freshest state

### Salesforce CLI
- `sf_get_org_info` / `sf_query` / `sf_run_apex` / `sf_deploy` / `sf_retrieve` / `sf_list_orgs` / `sf_describe_object`

### Browser Automation (Playwright)
- `browser_open` / `browser_click` / `browser_fill` / `browser_select` / `browser_screenshot` / `browser_get_text` / `browser_wait` / `browser_execute` / `browser_close`

### Agentforce ADLC (via companion skills)
When [agentforce-adlc](https://github.com/almandsky/agentforce-adlc) is installed, your agent also gets:
- `/adlc-author` — Generate `.agent` files from requirements
- `/adlc-discover` — Check which Flow/Apex/Retriever targets exist in the org
- `/adlc-scaffold` — Generate Flow XML and Apex stubs for missing targets
- `/adlc-deploy` — Validate, publish, and activate agent bundles
- `/adlc-run` — Execute individual actions against a live org
- `/adlc-test` — Preview + batch test agents with safety probes
- `/adlc-optimize` — Analyze STDM session traces and improve the agent
- `/adlc-safety` — LLM-driven safety and responsible AI review

## End-to-end workflow: Plan → Build → Deploy

1. **Plan the demo** — Use Buildify to write notes, create a storyboard, build a script
2. **Define the build** — Add to-do items and org details in Org Config
3. **Author the agent** — `/adlc-author` generates an `.agent` file from your requirements
4. **Check the org** — `/adlc-discover` finds what already exists
5. **Scaffold missing pieces** — `/adlc-scaffold` generates Flow/Apex stubs
6. **Deploy** — `sf_deploy` pushes prerequisites, `/adlc-deploy` publishes the agent
7. **Log it** — `record_agentforce_build("MyAgent", "path/to/file", "deployed")` tracks in the app
8. **Test** — `/adlc-test` runs smoke tests with safety probes
9. **Optimize** — `/adlc-optimize` analyzes production sessions and improves the agent

## Try it

Once connected, ask your agent:

> "Read my demo and summarize what I have so far."

> "Turn my notes into a 5-beat storyboard."

> "Build an Agentforce service agent based on my demo requirements."

## Prerequisites

- **Node.js 20+**
- **Salesforce CLI** (`npm install -g @salesforce/cli`) — for SF + ADLC tools
- **Python 3.9+** — for ADLC skills (optional)
- **Playwright** is bundled — browser tools work out of the box

## License

MIT

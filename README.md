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

## Try it

Once connected, ask your agent:

> "Read my demo and summarize what I have so far."

> "Turn my notes into a 5-beat storyboard."

> "Add a to-do item: Set up login flow automation."

## Prerequisites

- **Node.js 20+**
- **Salesforce CLI** (`npm install -g @salesforce/cli`) — only if using SF tools
- **Playwright** is bundled — browser tools work out of the box

## License

MIT

# Buildify Skills

MCP (Model Context Protocol) server that connects AI agents to your [Buildify](https://demo-building-app-f0300aa3e343.herokuapp.com) demo planning workspace. Use it with Claude Desktop, Cursor, Claude Code, or any MCP-compatible tool.

Your AI agent gets 32 tools to read and write across all demo tabs, navigate the UI, run Salesforce CLI commands, and automate browser interactions — all reflected live on your screen.

## Quick Start

```bash
git clone https://github.com/rdinh/buildify-skills.git
cd buildify-skills
npm install
npm run build
```

Then configure your AI tool (see below).

## Prerequisites

- **Node.js 20+**
- A **Buildify account** with an agent token (generate at `/agent-setup` in the app)
- **Salesforce CLI** (`npm install -g @salesforce/cli`) — for org operations
- **Python 3.8+** — for ADLC skills (optional)

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "buildify": {
      "command": "node",
      "args": ["/path/to/buildify-skills/dist/index.js"],
      "env": {
        "DEMO_TOOL_TOKEN": "<your-agent-token>",
        "APP_URL": "https://demo-building-app-f0300aa3e343.herokuapp.com"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "buildify": {
      "command": "node",
      "args": ["/path/to/buildify-skills/dist/index.js"],
      "env": {
        "DEMO_TOOL_TOKEN": "<your-agent-token>",
        "APP_URL": "https://demo-building-app-f0300aa3e343.herokuapp.com"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add buildify -- node /path/to/buildify-skills/dist/index.js
```

Set environment variables `DEMO_TOOL_TOKEN` and `APP_URL` before running.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DEMO_TOOL_TOKEN` | Agent token from Buildify's Agent Setup page (required) |
| `APP_URL` | Your Buildify app URL (default: `http://localhost:3000`) |

## Tool Reference

### Navigation
- `navigate_to_tab(tab)` — Navigate the user's screen to: `notes` | `storyboard` | `script` | `org-config` | `video`

### Demo Notes
- `read_demo_notes()` — Returns current notes as Tiptap JSON
- `write_demo_notes(content)` — Overwrites notes with new Tiptap JSON content

### Storyboard
- `get_storyboard()` — Returns all beats with title, description, imageUrl, order
- `add_storyboard_beat(title, description?, imageUrl?)` — Adds a new beat
- `reorder_storyboard(beatIds[])` — Reorders beats by ID array

### Script
- `get_script()` — Returns columns and all rows
- `add_script_row(cells)` — Add a row; cells is `{ columnId: value }`
- `update_script_row(rowId, cells)` — Partial update a row's cells

### Org Configuration
- `get_org_config()` — Returns all items
- `add_org_config_item(type, title, content?)` — type: `todo` | `requirement` | `doc` | `data`
- `update_org_config_item(itemId, { title?, content?, status? })` — Update an item
- `record_agentforce_build(agentName, agentFilePath?, status)` — Record an Agentforce build result

### Context & Freshness
- `get_current_demo()` — Returns full demo state including all tabs
- `get_tab_content(tab)` — Read just one tab's content
- `flush_and_read()` — Forces the user's browser to save pending edits, then returns fresh state

### Salesforce CLI
- `sf_get_org_info(alias?)` — Get org details
- `sf_query(soql, alias?)` — Run SOQL query
- `sf_run_apex(code, alias?)` — Execute anonymous Apex
- `sf_deploy(sourcePath, alias?)` — Deploy source metadata
- `sf_retrieve(metadata, alias?)` — Retrieve metadata
- `sf_list_orgs()` — List all authenticated orgs
- `sf_describe_object(sobject, alias?)` — Describe SObject fields

### Browser Automation (Playwright)
- `browser_open(url)` — Open a URL in a visible browser
- `browser_click(selector)` — Click an element
- `browser_fill(selector, value)` — Fill a text field
- `browser_select(selector, value)` — Select from a dropdown
- `browser_screenshot()` — Take a screenshot
- `browser_get_text(selector?)` — Get text content
- `browser_wait(selector, timeout?)` — Wait for an element
- `browser_execute(script)` — Run JavaScript in the page
- `browser_close()` — Close the browser

## Additional Documentation

- [SKILL.md](skills/SKILL.md) — Complete setup guide and workflow examples
- [ADLC_SETUP.md](skills/ADLC_SETUP.md) — Agentforce ADLC integration
- [SF_CLI_SETUP.md](skills/SF_CLI_SETUP.md) — Salesforce CLI authentication setup

## License

MIT

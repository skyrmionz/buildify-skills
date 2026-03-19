# Buildify MCP Skill

This skill connects Claude, Cursor, or other AI agents to the Salesforce Demo Planning Tool via MCP (Model Context Protocol).

## Overview

The Buildify helps Salesforce teams plan, create, and iterate on demos. As an AI agent, you can read and write to all demo tabs: Notes, Storyboard, Script, Org Configuration, and Video — and your changes appear live on the user's screen.

## Setup

1. Generate an agent token at the app's Agent Setup page (`/agent-setup`)
2. Select the demo project you want to work on
3. Copy the token shown (visible only once)

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "buildify": {
      "command": "node",
      "args": ["/path/to/buildify/mcp-server/dist/index.js"],
      "env": {
        "DEMO_TOOL_TOKEN": "<paste-your-token-here>",
        "APP_URL": "https://your-app.herokuapp.com"
      }
    }
  }
}
```

### Cursor Configuration

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "buildify": {
      "command": "node",
      "args": ["/path/to/buildify/mcp-server/dist/index.js"],
      "env": {
        "DEMO_TOOL_TOKEN": "<paste-your-token-here>",
        "APP_URL": "https://your-app.herokuapp.com"
      }
    }
  }
}
```

## Available Tools

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

### Salesforce CLI
- `sf_get_org_info(alias?)` — Get org details
- `sf_query(soql, alias?)` — Run SOQL query
- `sf_run_apex(code, alias?)` — Execute anonymous Apex
- `sf_deploy(sourcePath, alias?)` — Deploy source metadata
- `sf_retrieve(metadata, alias?)` — Retrieve metadata
- `sf_list_orgs()` — List all authenticated orgs
- `sf_describe_object(sobject, alias?)` — Describe SObject fields

### Context & Freshness
- `get_current_demo()` — Returns full demo state including all tabs. Always reads fresh from DB.
- `get_tab_content(tab)` — Read just one tab's content (lighter). Options: `notes`, `storyboard`, `script`, `org-config`
- `flush_and_read()` — **Use before making decisions.** Forces the user's browser to save any pending edits (e.g., unsaved text mid-typing), waits for the save, then returns the absolute freshest demo state.

### Browser Automation (Playwright)
When Salesforce CLI or ADLC can't do what you need, use the browser to interact with the Salesforce org Setup UI directly. The browser launches visibly so the user can watch.

- `browser_open(url)` — Open a URL (e.g., the Salesforce org login or Setup page)
- `browser_click(selector)` — Click an element (CSS selector or `text=Button Label`)
- `browser_fill(selector, value)` — Fill a text field
- `browser_select(selector, value)` — Select from a dropdown
- `browser_screenshot()` — Take a screenshot to see what's on screen
- `browser_get_text(selector?)` — Get text content of an element or the full page
- `browser_wait(selector, timeout?)` — Wait for an element to appear
- `browser_execute(script)` — Run JavaScript in the page context
- `browser_close()` — Close the browser when done

## Workflow Examples

### Build a demo from scratch
1. `get_current_demo()` — understand the current state
2. `write_demo_notes(content)` — write the demo requirements
3. `navigate_to_tab("storyboard")` — move to storyboard
4. `add_storyboard_beat(...)` — create beats from the notes
5. `navigate_to_tab("script")` — move to script
6. Use `get_script()` to get column IDs, then `add_script_row(...)` for each beat
7. `navigate_to_tab("org-config")` — move to org config
8. `add_org_config_item(...)` — add build requirements

### Build + deploy an Agentforce agent
1. Review org config requirements
2. Use ADLC skills (`/adlc-author`) to create the `.agent` file
3. Use `/adlc-scaffold` to generate Flow/Apex stubs
4. Use `sf_deploy(sourcePath)` to deploy to the org
5. Use `/adlc-deploy` to publish and activate
6. `record_agentforce_build(agentName, filePath, "deployed")` — record in org config

### Configure something in Salesforce Setup UI
When CLI/ADLC can't handle a specific Setup task:
1. `browser_open("https://your-org.lightning.force.com/lightning/setup/SetupOneHome/home")` — open Setup
2. `browser_screenshot()` — see what's on screen
3. `browser_click("text=Object Manager")` — navigate Setup UI
4. `browser_fill(...)` / `browser_click(...)` — make configuration changes
5. `browser_screenshot()` — verify the result
6. `browser_close()` — done

## Prerequisites

- **Node.js 20+** for the MCP server
- **Salesforce CLI (`sf`)** for org operations (install: `npm install -g @salesforce/cli`)
- **Playwright + Chromium** for browser automation (installed with the project)
- **Python 3.8+** for ADLC skills (optional)

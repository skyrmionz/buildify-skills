# Buildify MCP Skill

This skill connects AI agents to the Buildify demo planning workspace via MCP (Model Context Protocol). Your changes appear live on the user's screen.

## Setup

1. The user generates an agent token from the CLI drawer in the Buildify app (type `sync agent`)
2. The token is set as `DEMO_TOOL_TOKEN` env var
3. `APP_URL` points to `https://demo-building-app-f0300aa3e343.herokuapp.com`

## Available Tools (41)

### Navigation
- `navigate_to_tab(tab)` — Navigate the user's screen to: `notes` | `storyboard` | `script` | `org-config` | `video`

### Demo Notes
- `read_demo_notes()` — Returns current notes as Tiptap JSON
- `write_demo_notes(content)` — Overwrites notes with new Tiptap JSON content

### Storyboard
- `get_storyboard()` — Returns all beats with title, description, imageUrl, order
- `add_storyboard_beat(title, description?, imageUrl?)` — Add a new beat
- `update_storyboard_beat(beatId, { title?, description?, imageUrl? })` — Edit a beat
- `delete_storyboard_beat(beatId)` — Remove a beat
- `reorder_storyboard(beatIds[])` — Reorder beats by ID array

### Script
- `get_script()` — Returns columns and all rows
- `add_script_row(cells)` — Add a row; cells is `{ columnId: value }`
- `update_script_row(rowId, cells)` — Partial update a row's cells
- `delete_script_row(rowId)` — Remove a row
- `add_script_column(name)` — Add a column
- `delete_script_column(columnId)` — Remove a column and its cell data

### Org Configuration
- `get_org_config()` — Returns all items
- `add_org_config_item(type, title, content?, category?)` — type: `todo` | `doc` | `data`
- `update_org_config_item(itemId, { title?, content?, status?, category? })` — Update an item
- `delete_org_config_item(itemId)` — Remove an item
- `get_org_details()` — Read org credentials
- `update_org_details({ username?, password?, orgId?, orgAlias? })` — Update org credentials
- `record_agentforce_build(agentName, agentFilePath?, status)` — Record a build result

### Video
- `get_video_config()` — Read voice recordings, screen captures, demo video, revision notes
- `update_video_config({ voiceRecording?, screenCaptures?, demoVideo?, revisionNotes? })` — Update video config

### Context & Freshness
- `get_current_demo()` — Full demo state including all tabs. Always reads fresh from DB.
- `get_tab_content(tab)` — Read one tab's content (lighter). Options: `notes`, `storyboard`, `script`, `org-config`, `video`
- `update_demo_title(title)` — Rename the demo project
- `flush_and_read()` — **Use before making decisions.** Forces the user's browser to save pending edits, waits, then returns the freshest state.

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

## Best Practices

- **Always `flush_and_read()` first** before writing — this ensures you don't overwrite the user's unsaved edits
- **Use `get_tab_content(tab)` over `get_current_demo()`** when you only need one tab — it's lighter
- **Navigate the UI** with `navigate_to_tab()` so the user can see what you're working on
- **Use `update_*` tools** instead of replacing entire content — merge, don't overwrite

## Workflow Examples

### Build a demo from scratch
1. `flush_and_read()` — get the freshest state
2. `write_demo_notes(content)` — write demo requirements as notes
3. `navigate_to_tab("storyboard")` — show the user the storyboard
4. `add_storyboard_beat(...)` — create beats from the notes
5. `navigate_to_tab("script")` → `get_script()` → `add_script_row(...)` for each beat
6. `navigate_to_tab("org-config")` → `add_org_config_item(...)` — add build tasks

### Collaborate on existing content
1. `flush_and_read()` — read current state
2. Review what the user already has
3. Use `update_*` tools to modify specific items (don't replace everything)
4. Navigate to the relevant tab so the user sees the changes live

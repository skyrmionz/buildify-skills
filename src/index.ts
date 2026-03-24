#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { navigationTools, handleNavigation } from "./tools/navigation.js";
import { notesTools, handleNotes } from "./tools/notes.js";
import { storyboardTools, handleStoryboard } from "./tools/storyboard.js";
import { scriptTools, handleScript } from "./tools/script.js";
import { orgConfigTools, handleOrgConfig } from "./tools/org-config.js";
import { videoTools, handleVideo } from "./tools/video.js";
import { contextTools, handleContext } from "./tools/context.js";
import { salesforceTools, handleSalesforce } from "./tools/salesforce.js";
import { browserTools, handleBrowser } from "./tools/browser.js";

const server = new Server(
  { name: "buildify-mcp", version: "1.1.0" },
  { capabilities: { tools: {} } }
);

const allTools = [
  ...navigationTools,
  ...notesTools,
  ...storyboardTools,
  ...scriptTools,
  ...orgConfigTools,
  ...videoTools,
  ...contextTools,
  ...salesforceTools,
  ...browserTools,
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    let result: string;

    if (navigationTools.some((t) => t.name === name)) {
      result = await handleNavigation(name, args as Record<string, unknown>);
    } else if (notesTools.some((t) => t.name === name)) {
      result = await handleNotes(name, args as Record<string, unknown>);
    } else if (storyboardTools.some((t) => t.name === name)) {
      result = await handleStoryboard(name, args as Record<string, unknown>);
    } else if (scriptTools.some((t) => t.name === name)) {
      result = await handleScript(name, args as Record<string, unknown>);
    } else if (orgConfigTools.some((t) => t.name === name)) {
      result = await handleOrgConfig(name, args as Record<string, unknown>);
    } else if (videoTools.some((t) => t.name === name)) {
      result = await handleVideo(name, args as Record<string, unknown>);
    } else if (contextTools.some((t) => t.name === name)) {
      result = await handleContext(name, args as Record<string, unknown>);
    } else if (salesforceTools.some((t) => t.name === name)) {
      result = await handleSalesforce(name, args as Record<string, unknown>);
    } else if (browserTools.some((t) => t.name === name)) {
      result = await handleBrowser(name, args as Record<string, unknown>);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: "text", text: result }],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Buildify MCP server running on stdio");
}

main().catch(console.error);

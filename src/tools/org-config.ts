import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const orgConfigTools = [
  {
    name: "get_org_config",
    description: "Get all org configuration items for the current demo",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "add_org_config_item",
    description: "Add a new org configuration item",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["todo", "requirement", "doc", "data"],
          description: "Item type",
        },
        title: { type: "string", description: "Item title" },
        content: { type: "string", description: "Optional item content/details" },
      },
      required: ["type", "title"],
    },
  },
  {
    name: "update_org_config_item",
    description: "Update an existing org config item",
    inputSchema: {
      type: "object" as const,
      properties: {
        itemId: { type: "string", description: "The item ID to update" },
        title: { type: "string", description: "New title" },
        content: { type: "string", description: "New content" },
        status: {
          type: "string",
          enum: ["pending", "done", "in-progress"],
          description: "New status",
        },
      },
      required: ["itemId"],
    },
  },
  {
    name: "record_agentforce_build",
    description:
      "Record an Agentforce agent build result as a data item in Org Config",
    inputSchema: {
      type: "object" as const,
      properties: {
        agentName: { type: "string", description: "Name of the Agentforce agent" },
        agentFilePath: { type: "string", description: "Path to the .agent file" },
        status: {
          type: "string",
          enum: ["created", "deployed", "tested", "optimized"],
          description: "Current build status",
        },
      },
      required: ["agentName", "status"],
    },
  },
];

export async function handleOrgConfig(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "get_org_config") {
    const items = await apiCall(
      `/api/demos/${context.demoId}/org-config`
    );
    return JSON.stringify(items, null, 2);
  }

  if (name === "add_org_config_item") {
    const item = await apiCall(
      `/api/demos/${context.demoId}/org-config`,
      {
        method: "POST",
        body: {
          type: args.type,
          title: args.title,
          content: args.content,
        },
      }
    );
    return `Item added: ${item.title} (id: ${item.id})`;
  }

  if (name === "update_org_config_item") {
    const { itemId, ...rest } = args;
    await apiCall(
      `/api/demos/${context.demoId}/org-config/${itemId}`,
      { method: "PATCH", body: rest }
    );
    return "Item updated";
  }

  if (name === "record_agentforce_build") {
    const item = await apiCall(
      `/api/demos/${context.demoId}/org-config`,
      {
        method: "POST",
        body: {
          type: "data",
          title: `Agentforce: ${args.agentName}`,
          content: `Status: ${args.status}${args.agentFilePath ? ` | File: ${args.agentFilePath}` : ""}`,
        },
      }
    );
    return `Agentforce build recorded: ${item.title}`;
  }

  throw new Error(`Unknown org-config tool: ${name}`);
}

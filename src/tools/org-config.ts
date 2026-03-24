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
          enum: ["todo", "doc", "data"],
          description: "Item type: todo (checklist), doc (documentation link), data (build log)",
        },
        title: { type: "string", description: "Item title" },
        content: { type: "string", description: "Optional item content/details or URL for docs" },
        category: { type: "string", description: "Category for to-do items (default: General)" },
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
        category: { type: "string", description: "New category" },
      },
      required: ["itemId"],
    },
  },
  {
    name: "delete_org_config_item",
    description: "Delete an org config item by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        itemId: { type: "string", description: "The item ID to delete" },
      },
      required: ["itemId"],
    },
  },
  {
    name: "get_org_details",
    description:
      "Get the org details (username, password, org ID, org alias) for the current demo",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "update_org_details",
    description:
      "Update org details (username, password, orgId, orgAlias) for the current demo",
    inputSchema: {
      type: "object" as const,
      properties: {
        username: { type: "string", description: "Org username" },
        password: { type: "string", description: "Org password" },
        orgId: { type: "string", description: "Salesforce Org ID" },
        orgAlias: { type: "string", description: "Org alias" },
      },
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
          category: args.category,
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

  if (name === "delete_org_config_item") {
    await apiCall(
      `/api/demos/${context.demoId}/org-config/${args.itemId}`,
      { method: "DELETE" }
    );
    return `Item deleted (id: ${args.itemId})`;
  }

  if (name === "get_org_details") {
    const demo = await apiCall(`/api/demos/${context.demoId}`);
    const details = demo.orgDetails || {};
    return JSON.stringify(details, null, 2);
  }

  if (name === "update_org_details") {
    const { username, password, orgId, orgAlias } = args as Record<
      string,
      string
    >;
    const orgDetails: Record<string, string> = {};
    if (username !== undefined) orgDetails.username = username;
    if (password !== undefined) orgDetails.password = password;
    if (orgId !== undefined) orgDetails.orgId = orgId;
    if (orgAlias !== undefined) orgDetails.orgAlias = orgAlias;

    await apiCall(`/api/demos/${context.demoId}`, {
      method: "PATCH",
      body: { orgDetails },
    });
    return "Org details updated";
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

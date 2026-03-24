import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const contextTools = [
  {
    name: "get_current_demo",
    description:
      "Get the full current demo state including all tabs (notes, storyboard, script, org config, video, org details). This always reads fresh from the database, so you get the latest data including any user edits.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_tab_content",
    description:
      "Get only the content for a specific tab. Lighter than get_current_demo when you only need one tab's data.",
    inputSchema: {
      type: "object" as const,
      properties: {
        tab: {
          type: "string",
          enum: ["notes", "storyboard", "script", "org-config", "video"],
          description: "Which tab to read",
        },
      },
      required: ["tab"],
    },
  },
  {
    name: "update_demo_title",
    description: "Update the demo project's title",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "New title for the demo" },
      },
      required: ["title"],
    },
  },
  {
    name: "flush_and_read",
    description:
      "Trigger a save of any pending user edits (e.g., unsaved text in the editor), then return the freshest demo state. Use this before making decisions based on user content to ensure you have the absolute latest version.",
    inputSchema: { type: "object" as const, properties: {} },
  },
];

export async function handleContext(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "get_current_demo") {
    const demo = await apiCall(`/api/demos/${context.demoId}`);
    return JSON.stringify(demo, null, 2);
  }

  if (name === "get_tab_content") {
    const tab = args.tab as string;
    switch (tab) {
      case "notes": {
        const notes = await apiCall(`/api/demos/${context.demoId}/notes`);
        return JSON.stringify(notes, null, 2);
      }
      case "storyboard": {
        const beats = await apiCall(`/api/demos/${context.demoId}/beats`);
        return JSON.stringify(beats, null, 2);
      }
      case "script": {
        const [columns, rows] = await Promise.all([
          apiCall(`/api/demos/${context.demoId}/script/columns`),
          apiCall(`/api/demos/${context.demoId}/script/rows`),
        ]);
        return JSON.stringify({ columns, rows }, null, 2);
      }
      case "org-config": {
        const items = await apiCall(`/api/demos/${context.demoId}/org-config`);
        return JSON.stringify(items, null, 2);
      }
      case "video": {
        const config = await apiCall(`/api/demos/${context.demoId}/video`);
        return JSON.stringify(config, null, 2);
      }
      default:
        throw new Error(`Unknown tab: ${tab}`);
    }
  }

  if (name === "update_demo_title") {
    await apiCall(`/api/demos/${context.demoId}`, {
      method: "PATCH",
      body: { title: args.title },
    });
    return `Demo title updated to: ${args.title}`;
  }

  if (name === "flush_and_read") {
    await apiCall("/api/agent/navigate", {
      method: "POST",
      body: { demoId: context.demoId, tab: "__flush__" },
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const demo = await apiCall(`/api/demos/${context.demoId}`);
    return JSON.stringify(demo, null, 2);
  }

  throw new Error(`Unknown context tool: ${name}`);
}

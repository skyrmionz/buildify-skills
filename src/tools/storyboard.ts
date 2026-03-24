import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const storyboardTools = [
  {
    name: "get_storyboard",
    description: "Get all storyboard beats for the current demo",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "add_storyboard_beat",
    description: "Add a new storyboard beat",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Beat title" },
        description: { type: "string", description: "Beat description" },
        imageUrl: { type: "string", description: "Optional image URL" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_storyboard_beat",
    description:
      "Update an existing storyboard beat's title, description, or image",
    inputSchema: {
      type: "object" as const,
      properties: {
        beatId: { type: "string", description: "The beat ID to update" },
        title: { type: "string", description: "New title" },
        description: { type: "string", description: "New description" },
        imageUrl: { type: "string", description: "New image URL" },
      },
      required: ["beatId"],
    },
  },
  {
    name: "delete_storyboard_beat",
    description: "Delete a storyboard beat by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        beatId: { type: "string", description: "The beat ID to delete" },
      },
      required: ["beatId"],
    },
  },
  {
    name: "reorder_storyboard",
    description: "Reorder storyboard beats by providing the beat IDs in new order",
    inputSchema: {
      type: "object" as const,
      properties: {
        beatIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of beat IDs in desired order",
        },
      },
      required: ["beatIds"],
    },
  },
];

export async function handleStoryboard(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "get_storyboard") {
    const beats = await apiCall(`/api/demos/${context.demoId}/beats`);
    return JSON.stringify(beats, null, 2);
  }

  if (name === "add_storyboard_beat") {
    const beat = await apiCall(`/api/demos/${context.demoId}/beats`, {
      method: "POST",
      body: {
        title: args.title,
        description: args.description,
        imageUrl: args.imageUrl,
      },
    });
    return `Beat added: ${beat.title} (id: ${beat.id})`;
  }

  if (name === "update_storyboard_beat") {
    const { beatId, ...rest } = args;
    const beat = await apiCall(
      `/api/demos/${context.demoId}/beats/${beatId}`,
      { method: "PATCH", body: rest }
    );
    return `Beat updated: ${beat.title} (id: ${beat.id})`;
  }

  if (name === "delete_storyboard_beat") {
    await apiCall(`/api/demos/${context.demoId}/beats/${args.beatId}`, {
      method: "DELETE",
    });
    return `Beat deleted (id: ${args.beatId})`;
  }

  if (name === "reorder_storyboard") {
    await apiCall(`/api/demos/${context.demoId}/beats/reorder`, {
      method: "POST",
      body: { order: args.beatIds },
    });
    return "Storyboard reordered";
  }

  throw new Error(`Unknown storyboard tool: ${name}`);
}

import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const notesTools = [
  {
    name: "read_demo_notes",
    description: "Read the current demo notes content",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "write_demo_notes",
    description: "Write or update the demo notes content (Tiptap JSON format)",
    inputSchema: {
      type: "object" as const,
      properties: {
        content: {
          type: "object",
          description: "Tiptap JSON document content",
        },
      },
      required: ["content"],
    },
  },
];

export async function handleNotes(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "read_demo_notes") {
    const notes = await apiCall(`/api/demos/${context.demoId}/notes`);
    return JSON.stringify(notes?.content || {}, null, 2);
  }

  if (name === "write_demo_notes") {
    await apiCall(`/api/demos/${context.demoId}/notes`, {
      method: "PUT",
      body: { content: args.content },
    });
    return "Notes updated successfully";
  }

  throw new Error(`Unknown notes tool: ${name}`);
}

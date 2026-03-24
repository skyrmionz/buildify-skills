import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const videoTools = [
  {
    name: "get_video_config",
    description:
      "Get the video configuration for the current demo, including voice recording status, screen captures, demo video, and revision notes",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "update_video_config",
    description:
      "Update the video configuration. Pass only the fields you want to change; they are merged with existing config.",
    inputSchema: {
      type: "object" as const,
      properties: {
        voiceRecording: {
          type: "string",
          description: "Base64 data URI of a voice recording",
        },
        screenCaptures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dataUri: { type: "string" },
              type: { type: "string" },
            },
          },
          description: "Array of screen capture objects",
        },
        demoVideo: {
          type: "string",
          description: "Base64 data URI or URL of the generated demo video",
        },
        revisionNotes: {
          type: "array",
          items: { type: "string" },
          description: "Array of revision note strings",
        },
      },
    },
  },
];

export async function handleVideo(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "get_video_config") {
    const config = await apiCall(`/api/demos/${context.demoId}/video`);
    return JSON.stringify(config, null, 2);
  }

  if (name === "update_video_config") {
    const existing = await apiCall(`/api/demos/${context.demoId}/video`);
    const merged = { ...existing, ...args };
    await apiCall(`/api/demos/${context.demoId}/video`, {
      method: "PATCH",
      body: merged,
    });
    return "Video config updated";
  }

  throw new Error(`Unknown video tool: ${name}`);
}

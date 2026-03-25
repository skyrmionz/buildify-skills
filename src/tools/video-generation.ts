import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const videoGenerationTools = [
  {
    name: "save_screen_recording",
    description:
      "Save a screen recording (from browser_stop_recording) to the demo's screen captures list. The recording can then be used in video composition with compose_demo_video.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoDataUri: {
          type: "string",
          description:
            "The screen recording data URI from browser_stop_recording",
        },
        addToCaptures: {
          type: "boolean",
          description:
            "Whether to add this recording to the screen captures list (default: true)",
        },
      },
      required: ["videoDataUri"],
    },
  },
];

export async function handleVideoGeneration(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (name !== "save_screen_recording") {
    throw new Error(`Unknown video generation tool: ${name}`);
  }

  const context = await validateAgentToken();
  const videoDataUri = args.videoDataUri as string;
  const addToCaptures = args.addToCaptures !== false;

  if (!videoDataUri || !videoDataUri.startsWith("data:")) {
    return "Error: videoDataUri must be a valid data URI from browser_stop_recording.";
  }

  const videoConfig = await apiCall(
    `/api/demos/${context.demoId}/video`
  ).catch(() => ({}));

  if (addToCaptures) {
    const existingCaptures = (videoConfig?.screenCaptures as Array<{
      name: string;
      dataUri: string;
      type: string;
    }>) || [];

    const captureName = `Screen Recording ${existingCaptures.length + 1}`;
    const mimeMatch = videoDataUri.match(/^data:(video\/\w+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : "video/webm";

    existingCaptures.push({
      name: captureName,
      dataUri: videoDataUri,
      type: mimeType,
    });

    await apiCall(`/api/demos/${context.demoId}/video`, {
      method: "PATCH",
      body: { ...videoConfig, screenCaptures: existingCaptures },
    });

    return `Screen recording saved as "${captureName}" (capture #${existingCaptures.length}). Use compose_demo_video to include it in the final video.`;
  }

  // Just save as the demo video directly
  await apiCall(`/api/demos/${context.demoId}/video`, {
    method: "PATCH",
    body: { ...videoConfig, demoVideo: videoDataUri },
  });

  return "Screen recording saved as the demo video.";
}

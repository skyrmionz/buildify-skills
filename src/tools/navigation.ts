import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const navigationTools = [
  {
    name: "navigate_to_tab",
    description:
      "Navigate the user's app to a specific demo tab. Tab options: notes, storyboard, script, org-config, video",
    inputSchema: {
      type: "object" as const,
      properties: {
        tab: {
          type: "string",
          enum: ["notes", "storyboard", "script", "org-config", "video"],
          description: "The tab to navigate to",
        },
      },
      required: ["tab"],
    },
  },
];

export async function handleNavigation(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "navigate_to_tab") {
    await apiCall("/api/agent/navigate", {
      method: "POST",
      body: { demoId: context.demoId, tab: args.tab },
    });
    return `Navigated to ${args.tab} tab`;
  }

  throw new Error(`Unknown navigation tool: ${name}`);
}

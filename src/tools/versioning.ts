import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const versioningTools = [
  {
    name: "list_tab_versions",
    description:
      "List version history for a tab (notes, storyboard, script, org_config) in the current demo",
    inputSchema: {
      type: "object" as const,
      properties: {
        tab: {
          type: "string",
          enum: ["notes", "storyboard", "script", "org_config"],
          description: "Which tab to get versions for",
        },
      },
      required: ["tab"],
    },
  },
  {
    name: "restore_tab_version",
    description:
      "Restore a previous version of a tab. The current state is automatically saved before restoring.",
    inputSchema: {
      type: "object" as const,
      properties: {
        versionId: {
          type: "string",
          description: "The version ID to restore",
        },
      },
      required: ["versionId"],
    },
  },
];

export async function handleVersioning(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const context = await validateAgentToken();

  if (name === "list_tab_versions") {
    const data = await apiCall(
      `/api/demos/${context.demoId}/versions?tab=${args.tab}&limit=20`
    );
    const versions = data.versions as Array<{
      id: string;
      version: number;
      trigger: string;
      createdAt: string;
      user: { name: string | null; email: string };
    }>;
    if (!versions.length) return `No versions found for ${args.tab}`;
    return versions
      .map(
        (v) =>
          `v${v.version} (${v.trigger}) — ${new Date(v.createdAt).toLocaleString()} by ${v.user.name || v.user.email.split("@")[0]} [id: ${v.id}]`
      )
      .join("\n");
  }

  if (name === "restore_tab_version") {
    await apiCall(
      `/api/demos/${context.demoId}/versions/${args.versionId}`,
      { method: "POST" }
    );
    return "Version restored successfully. Current state was saved before restoring.";
  }

  throw new Error(`Unknown versioning tool: ${name}`);
}

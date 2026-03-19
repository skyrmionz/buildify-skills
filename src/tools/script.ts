import { apiCall } from "../client.js";
import { validateAgentToken } from "../auth.js";

export const scriptTools = [
  {
    name: "get_script",
    description: "Get all script columns and rows for the current demo",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "add_script_row",
    description: "Add a new row to the demo script",
    inputSchema: {
      type: "object" as const,
      properties: {
        cells: {
          type: "object",
          description:
            "Map of columnId -> cell value. Get column IDs from get_script.",
        },
      },
      required: ["cells"],
    },
  },
  {
    name: "update_script_row",
    description: "Update an existing script row",
    inputSchema: {
      type: "object" as const,
      properties: {
        rowId: { type: "string", description: "The row ID to update" },
        cells: {
          type: "object",
          description: "Partial map of columnId -> new value",
        },
      },
      required: ["rowId", "cells"],
    },
  },
];

export async function handleScript(
  name: string,
  args: Record<string, unknown>
) {
  const context = await validateAgentToken();

  if (name === "get_script") {
    const [columns, rows] = await Promise.all([
      apiCall(`/api/demos/${context.demoId}/script/columns`),
      apiCall(`/api/demos/${context.demoId}/script/rows`),
    ]);
    return JSON.stringify({ columns, rows }, null, 2);
  }

  if (name === "add_script_row") {
    const row = await apiCall(`/api/demos/${context.demoId}/script/rows`, {
      method: "POST",
      body: { cells: args.cells },
    });
    return `Row added (id: ${row.id})`;
  }

  if (name === "update_script_row") {
    await apiCall(
      `/api/demos/${context.demoId}/script/rows/${args.rowId}`,
      {
        method: "PATCH",
        body: { cells: args.cells },
      }
    );
    return "Row updated";
  }

  throw new Error(`Unknown script tool: ${name}`);
}

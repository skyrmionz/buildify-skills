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
  {
    name: "delete_script_row",
    description: "Delete a script row by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        rowId: { type: "string", description: "The row ID to delete" },
      },
      required: ["rowId"],
    },
  },
  {
    name: "add_script_column",
    description: "Add a new column to the script table",
    inputSchema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Column name" },
      },
      required: ["name"],
    },
  },
  {
    name: "delete_script_column",
    description:
      "Delete a script column by ID. All cell data in that column will be lost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        columnId: { type: "string", description: "The column ID to delete" },
      },
      required: ["columnId"],
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

  if (name === "delete_script_row") {
    await apiCall(
      `/api/demos/${context.demoId}/script/rows/${args.rowId}`,
      { method: "DELETE" }
    );
    return `Row deleted (id: ${args.rowId})`;
  }

  if (name === "add_script_column") {
    const col = await apiCall(
      `/api/demos/${context.demoId}/script/columns`,
      { method: "POST", body: { name: args.name } }
    );
    return `Column added: ${col.name} (id: ${col.id})`;
  }

  if (name === "delete_script_column") {
    await apiCall(
      `/api/demos/${context.demoId}/script/columns/${args.columnId}`,
      { method: "DELETE" }
    );
    return `Column deleted (id: ${args.columnId})`;
  }

  throw new Error(`Unknown script tool: ${name}`);
}

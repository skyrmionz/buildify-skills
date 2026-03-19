import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

async function runSfCommand(
  args: string[],
  alias?: string
): Promise<string> {
  const fullArgs = [...args, "--json"];
  if (alias) fullArgs.push("-o", alias);

  try {
    const { stdout, stderr } = await execFileAsync("sf", fullArgs, {
      timeout: 60000,
    });
    return stdout || stderr;
  } catch (err: unknown) {
    const execErr = err as { stdout?: string; stderr?: string; message?: string };
    if (execErr.stdout) return execErr.stdout;
    throw new Error(execErr.stderr || execErr.message || "sf command failed");
  }
}

export const salesforceTools = [
  {
    name: "sf_get_org_info",
    description: "Get information about a Salesforce org",
    inputSchema: {
      type: "object" as const,
      properties: {
        alias: { type: "string", description: "Org alias (optional)" },
      },
    },
  },
  {
    name: "sf_query",
    description: "Run a SOQL query against a Salesforce org",
    inputSchema: {
      type: "object" as const,
      properties: {
        soql: { type: "string", description: "SOQL query string" },
        alias: { type: "string", description: "Org alias (optional)" },
      },
      required: ["soql"],
    },
  },
  {
    name: "sf_run_apex",
    description: "Execute anonymous Apex code against a Salesforce org",
    inputSchema: {
      type: "object" as const,
      properties: {
        code: { type: "string", description: "Apex code to execute" },
        alias: { type: "string", description: "Org alias (optional)" },
      },
      required: ["code"],
    },
  },
  {
    name: "sf_deploy",
    description: "Deploy source to a Salesforce org",
    inputSchema: {
      type: "object" as const,
      properties: {
        sourcePath: {
          type: "string",
          description: "Path to the source directory to deploy",
        },
        alias: { type: "string", description: "Org alias (optional)" },
      },
      required: ["sourcePath"],
    },
  },
  {
    name: "sf_retrieve",
    description: "Retrieve metadata from a Salesforce org",
    inputSchema: {
      type: "object" as const,
      properties: {
        metadata: {
          type: "string",
          description: "Metadata to retrieve (e.g., 'ApexClass:MyClass')",
        },
        alias: { type: "string", description: "Org alias (optional)" },
      },
      required: ["metadata"],
    },
  },
  {
    name: "sf_list_orgs",
    description: "List all authenticated Salesforce orgs",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "sf_describe_object",
    description: "Describe a Salesforce object and its fields",
    inputSchema: {
      type: "object" as const,
      properties: {
        sobject: {
          type: "string",
          description: "SObject API name (e.g., Account, Contact)",
        },
        alias: { type: "string", description: "Org alias (optional)" },
      },
      required: ["sobject"],
    },
  },
];

export async function handleSalesforce(
  name: string,
  args: Record<string, unknown>
) {
  const alias = args.alias as string | undefined;

  switch (name) {
    case "sf_get_org_info":
      return await runSfCommand(["org", "display"], alias);

    case "sf_query":
      return await runSfCommand(
        ["data", "query", "--query", args.soql as string],
        alias
      );

    case "sf_run_apex": {
      const tmpFile = join(tmpdir(), `apex-${randomUUID()}.apex`);
      await writeFile(tmpFile, args.code as string);
      try {
        return await runSfCommand(
          ["apex", "run", "--file", tmpFile],
          alias
        );
      } finally {
        await unlink(tmpFile).catch(() => {});
      }
    }

    case "sf_deploy":
      return await runSfCommand(
        ["project", "deploy", "start", "--source-dir", args.sourcePath as string],
        alias
      );

    case "sf_retrieve":
      return await runSfCommand(
        ["project", "retrieve", "start", "--metadata", args.metadata as string],
        alias
      );

    case "sf_list_orgs":
      return await runSfCommand(["org", "list"]);

    case "sf_describe_object":
      return await runSfCommand(
        ["sobject", "describe", "--sobject", args.sobject as string],
        alias
      );

    default:
      throw new Error(`Unknown salesforce tool: ${name}`);
  }
}

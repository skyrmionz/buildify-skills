import { createHash } from "crypto";

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const TOKEN = process.env.DEMO_TOOL_TOKEN || "";

export async function validateAgentToken(): Promise<{
  userId: string;
  demoId: string;
}> {
  if (!TOKEN) throw new Error("DEMO_TOOL_TOKEN environment variable not set");

  const tokenHash = createHash("sha256").update(TOKEN).digest("hex");

  const res = await fetch(`${APP_URL}/api/agent/session/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenHash }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Token validation failed: ${err.error}`);
  }

  return res.json();
}

export function getAppUrl(): string {
  return APP_URL;
}

export function getToken(): string {
  return TOKEN;
}

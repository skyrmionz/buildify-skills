import { getAppUrl, getToken } from "./auth.js";

export async function apiCall(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const { method = "GET", body } = options;
  const url = `${getAppUrl()}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Agent-Token": getToken(),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API call failed: ${res.status} ${err}`);
  }

  return res.json();
}

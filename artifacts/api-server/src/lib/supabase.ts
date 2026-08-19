import { ReplitConnectors } from "@replit/connectors-sdk";

export const connectors = new ReplitConnectors();

export async function supabaseRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return connectors.proxy("supabase", path, { ...init, headers });
}

export async function responseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}
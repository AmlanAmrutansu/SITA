import { ReplitConnectors } from "@replit/connectors-sdk";

export const connectors = new ReplitConnectors();

export async function supabaseRequest(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  const headers: Record<string, string> = Object.fromEntries(
    new Headers(init.headers).entries(),
  );
  headers["Content-Type"] = "application/json";

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (supabaseAnonKey) {
    headers["apikey"] = supabaseAnonKey;
    headers["Authorization"] = `Bearer ${supabaseAnonKey}`;
  }

  // 1. Direct standard Supabase URL if environment variables are set
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const targetUrl = `${supabaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
      return await fetch(targetUrl, { ...init, headers });
    } catch (err) {
      console.warn("[SITA Supabase] Direct fetch failed, trying connector fallback:", err);
    }
  }

  // 2. Connector Proxy fallback
  try {
    return await connectors.proxy("supabase", path, { ...init, headers });
  } catch (err) {
    console.error("[SITA Supabase] Connection error:", err);
    return new Response(
      JSON.stringify({
        message:
          "Supabase service is temporarily unavailable. Please check your network or credentials.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
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

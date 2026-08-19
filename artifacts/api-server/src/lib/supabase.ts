let connectors: any = null;

async function getConnectors() {
  if (connectors) return connectors;
  try {
    const { ReplitConnectors } = await import("@replit/connectors-sdk");
    connectors = new ReplitConnectors();
  } catch (e) {
    // Ignore error if not in Replit
  }
  return connectors;
}

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
      console.warn("[SITA Supabase] Direct fetch failed:", err);
    }
  }

  // 2. Connector Proxy fallback
  const c = await getConnectors();
  if (c) {
    try {
      return await c.proxy("supabase", path, { ...init, headers });
    } catch (err) {
      console.error("[SITA Supabase] Connection error via connector:", err);
    }
  }

  return new Response(
    JSON.stringify({
      message:
        "Supabase service is temporarily unavailable. Please check your network or credentials.",
    }),
    { status: 503, headers: { "Content-Type": "application/json" } },
  );
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

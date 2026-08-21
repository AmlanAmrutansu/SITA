import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";

const router: IRouter = Router();
const access = (req: Request) => (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.split(" ")[1] : req.cookies?.sita_access_token) as string | undefined;

const allowedTables = new Set([
  "profiles",
  "moods",
  "cycle_logs",
  "symptom_logs",
  "pregnancy_data",
  "postpartum_data",
  "screening_sessions",
  "health_insights",
  "ai_conversations",
  "chat_messages",
]);

async function getAuthenticatedUser(token: string) {
  const userResponse = await supabaseRequest("/auth/v1/user", { method: "GET" }, token);
  if (!userResponse.ok) return null;
  return responseJson(userResponse);
}

async function proxyTable(req: Request, res: any, table: string, method: string, query = "") {
  if (!allowedTables.has(table)) {
    res.status(404).json({ message: "Unknown data collection." });
    return;
  }
  const token = access(req);
  if (!token) return res.status(401).json({ message: "Please sign in to save your health data." });

  let body = req.body;
  if (method === "POST" || method === "PATCH") {
    const user = await getAuthenticatedUser(token);
    if (!user?.id) {
      return res.status(401).json({ message: "Your session has expired." });
    }
    if (method === "POST") {
      body = Array.isArray(req.body)
        ? req.body.map((row) => ({ ...row, user_id: user.id }))
        : { ...req.body, user_id: user.id };
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (method === "POST") headers["Prefer"] = "return=representation";
  if (method === "PATCH") headers["Prefer"] = "return=representation";

  const response = await supabaseRequest(
    `/rest/v1/${table}${query}`,
    {
      method,
      headers,
      body: method === "POST" || method === "PATCH" ? JSON.stringify(body) : undefined,
    },
    token,
  );

  const data = await responseJson(response);
  if (!response.ok) return res.status(response.status).json(data);
  res.status(response.status === 204 ? 204 : 200).json(data);
}

router.get("/data/:table", (req, res) => {
  const order = req.query.order ? String(req.query.order) : "created_at.desc";
  const limit = req.query.limit ? String(req.query.limit) : "200";
  proxyTable(req, res, req.params.table, "GET", `?select=*&order=${order}&limit=${limit}`);
});

router.post("/data/:table", (req, res) => proxyTable(req, res, req.params.table, "POST"));

router.patch("/data/:table/:id", (req, res) =>
  proxyTable(req, res, req.params.table, "PATCH", `?id=eq.${encodeURIComponent(req.params.id)}`),
);

router.delete("/data/:table/by-date/:date", (req, res) =>
  proxyTable(req, res, req.params.table, "DELETE", `?period_date=eq.${encodeURIComponent(req.params.date)}`),
);

router.delete("/data/:table/:id", (req, res) =>
  proxyTable(req, res, req.params.table, "DELETE", `?id=eq.${encodeURIComponent(req.params.id)}`),
);

// Full user data export
router.get("/data-export", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.status(401).json({ message: "Please sign in to export your data." });
    return;
  }
  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    res.status(401).json({ message: "Your session has expired." });
    return;
  }

  const exportData: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, email: user.email },
  };

  for (const table of Array.from(allowedTables)) {
    const tableResp = await supabaseRequest(`/rest/v1/${table}?select=*`, { method: "GET" }, token);
    exportData[table] = tableResp.ok ? await responseJson(tableResp) : [];
  }

  res.setHeader("Content-Disposition", 'attachment; filename="sita-health-export.json"');
  res.setHeader("Content-Type", "application/json");
  res.json(exportData);
});

// Full user data purge / deletion
router.delete("/data-purge", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.status(401).json({ message: "Please sign in to delete your data." });
    return;
  }
  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    res.status(401).json({ message: "Your session has expired." });
    return;
  }

  // Delete from child tables in sequence
  for (const table of ["chat_messages", "ai_conversations", "screening_sessions", "health_insights", "postpartum_data", "pregnancy_data", "symptom_logs", "moods", "cycle_logs"]) {
    await supabaseRequest(`/rest/v1/${table}?user_id=eq.${user.id}`, { method: "DELETE" }, token).catch(() => null);
  }
  await supabaseRequest(`/rest/v1/profiles?id=eq.${user.id}`, { method: "DELETE" }, token).catch(() => null);

  res.clearCookie("sita_access_token");
  res.clearCookie("sita_refresh_token");
  res.status(200).json({ message: "All health data has been completely and securely removed." });
});

export default router;

import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";

const router: IRouter = Router();
const access = (req: Request) => req.cookies?.sita_access_token as string | undefined;
const allowedTables = new Set(["moods", "cycle_logs", "chat_messages"]);

async function proxyTable(req: Request, res: any, table: string, method: string, query = "") {
  if (!allowedTables.has(table)) { res.status(404).json({ message: "Unknown data collection." }); return; }
  const token = access(req);
  if (!token) return res.status(401).json({ message: "Please sign in to save your health data." });
  let body = req.body;
  if (method === "POST") {
    const userResponse = await supabaseRequest("/auth/v1/user", { method: "GET" }, token);
    const user = userResponse.ok ? await responseJson(userResponse) : null;
    if (!user?.id) { res.status(401).json({ message: "Your session has expired." }); return; }
    body = Array.isArray(req.body) ? req.body.map((row) => ({ ...row, user_id: user.id })) : { ...req.body, user_id: user.id };
  }
  const response = await supabaseRequest(`/rest/v1/${table}${query}`, { method, headers: method === "POST" ? { Prefer: "return=representation" } : undefined, body: method === "POST" ? JSON.stringify(body) : undefined }, token);
  const data = await responseJson(response);
  if (!response.ok) return res.status(response.status).json(data);
  res.status(response.status === 204 ? 204 : 200).json(data);
}

router.get("/data/:table", (req, res) => proxyTable(req, res, req.params.table, "GET", "?select=*&order=created_at.desc&limit=100"));
router.post("/data/:table", (req, res) => proxyTable(req, res, req.params.table, "POST"));
router.delete("/data/:table/by-date/:date", (req, res) => proxyTable(req, res, req.params.table, "DELETE", `?period_date=eq.${encodeURIComponent(req.params.date)}`));
router.delete("/data/:table/:id", (req, res) => proxyTable(req, res, req.params.table, "DELETE", `?id=eq.${encodeURIComponent(req.params.id)}`));

export default router;
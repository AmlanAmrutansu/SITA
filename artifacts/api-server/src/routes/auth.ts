import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";

const router: IRouter = Router();
const ACCESS_COOKIE = "sita_access_token";
const REFRESH_COOKIE = "sita_refresh_token";

function setSessionCookies(res: any, session: any) {
  res.cookie(ACCESS_COOKIE, session.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600_000 });
  res.cookie(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 3600_000 });
}

function token(req: Request) {
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

router.get("/auth/session", async (req, res) => {
  const accessToken = token(req);
  if (!accessToken) return res.json({ user: null });
  const response = await supabaseRequest("/auth/v1/user", { method: "GET" }, accessToken);
  if (!response.ok) return res.json({ user: null });
  res.json({ user: await responseJson(response) });
});

router.post("/auth/signup", async (req, res) => {
  const response = await supabaseRequest("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: req.body.email, password: req.body.password, data: { display_name: req.body.displayName ?? "Kirti" } }) });
  const data = await responseJson(response);
  if (!response.ok) return res.status(response.status).json({ message: data?.msg ?? data?.message ?? "Could not create your account." });
  if (data?.access_token) setSessionCookies(res, data);
  res.status(201).json({ user: data.user ?? data, needsEmailConfirmation: !data?.access_token });
});

router.post("/auth/login", async (req, res) => {
  const response = await supabaseRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: req.body.email, password: req.body.password }) });
  const data = await responseJson(response);
  if (!response.ok) return res.status(response.status).json({ message: data?.error_description ?? data?.msg ?? "Those details did not work." });
  setSessionCookies(res, data);
  res.json({ user: data.user });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
  res.status(204).end();
});

router.get("/me", async (req, res) => {
  const accessToken = token(req);
  if (!accessToken) return res.status(401).json({ message: "Please sign in." });
  const response = await supabaseRequest("/rest/v1/profiles?select=*", { method: "GET" }, accessToken);
  const data = await responseJson(response);
  if (!response.ok) return res.status(response.status).json(data);
  res.json(data?.[0] ?? null);
});

router.patch("/me", async (req, res) => {
  const accessToken = token(req);
  if (!accessToken) return res.status(401).json({ message: "Please sign in." });
  const response = await supabaseRequest("/rest/v1/profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(req.body) }, accessToken);
  const data = await responseJson(response);
  if (!response.ok) return res.status(response.status).json(data);
  res.json(data?.[0] ?? data);
});

export default router;
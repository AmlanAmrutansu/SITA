import { Router, type IRouter, type Request } from "express";
import { createHash, randomBytes } from "node:crypto";
import { responseJson, supabaseRequest } from "../lib/supabase";

const router: IRouter = Router();
const ACCESS_COOKIE = "sita_access_token";
const REFRESH_COOKIE = "sita_refresh_token";
const PKCE_COOKIE = "sita_pkce_verifier";

function setSessionCookies(res: any, session: any) {
  res.cookie(ACCESS_COOKIE, session.access_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 3600_000 });
  res.cookie(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 30 * 24 * 3600_000 });
}

function token(req: Request) {
  return req.cookies?.[ACCESS_COOKIE] as string | undefined;
}

function publicOrigin(req: Request) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProto === "string" ? forwardedProto.split(",")[0] : req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function cookieOptions(maxAge: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge };
}

router.get("/auth/google", async (req, res): Promise<void> => {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${publicOrigin(req)}/api/auth/callback`;
  const response = await supabaseRequest(`/auth/v1/authorize?provider=google&code_challenge=${encodeURIComponent(challenge)}&code_challenge_method=s256&redirect_to=${encodeURIComponent(redirectUri)}`, { method: "GET" });
  const location = response.headers.get("location");
  if (!location) { res.status(502).json({ message: "Google sign-in is not configured in Supabase yet." }); return; }
  res.cookie(PKCE_COOKIE, verifier, cookieOptions(10 * 60_000));
  res.redirect(location);
});

router.get("/auth/callback", async (req, res): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const verifier = req.cookies?.[PKCE_COOKIE] as string | undefined;
  if (!code || !verifier) { res.redirect("/auth?error=google_callback"); return; }
  const response = await supabaseRequest("/auth/v1/token?grant_type=pkce", { method: "POST", body: JSON.stringify({ auth_code: code, code_verifier: verifier }) });
  const data = await responseJson(response);
  res.clearCookie(PKCE_COOKIE);
  if (!response.ok || !data?.access_token) { res.redirect(`/auth?error=${encodeURIComponent(data?.msg ?? "google_sign_in_failed")}`); return; }
  setSessionCookies(res, data);
  res.redirect("/onboarding");
});

router.get("/auth/session", async (req, res): Promise<void> => {
  const accessToken = token(req);
  if (!accessToken) { res.json({ user: null }); return; }
  const response = await supabaseRequest("/auth/v1/user", { method: "GET" }, accessToken);
  if (!response.ok) { res.json({ user: null }); return; }
  res.json({ user: await responseJson(response) });
});

router.post("/auth/signup", async (req, res): Promise<void> => {
  const response = await supabaseRequest("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email: req.body.email, password: req.body.password, data: { display_name: req.body.displayName ?? "Kirti" } }) });
  const data = await responseJson(response);
  if (!response.ok) { res.status(response.status).json({ message: data?.msg ?? data?.message ?? "Could not create your account." }); return; }
  if (data?.access_token) setSessionCookies(res, data);
  res.status(201).json({ user: data.user ?? data, needsEmailConfirmation: !data?.access_token });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const response = await supabaseRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email: req.body.email, password: req.body.password }) });
  const data = await responseJson(response);
  if (!response.ok) { res.status(response.status).json({ message: data?.error_description ?? data?.msg ?? "Those details did not work." }); return; }
  setSessionCookies(res, data);
  res.json({ user: data.user });
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie(ACCESS_COOKIE);
  res.clearCookie(REFRESH_COOKIE);
  res.status(204).end();
});

router.get("/me", async (req, res): Promise<void> => {
  const accessToken = token(req);
  if (!accessToken) { res.status(401).json({ message: "Please sign in." }); return; }
  const response = await supabaseRequest("/rest/v1/profiles?select=*", { method: "GET" }, accessToken);
  const data = await responseJson(response);
  if (!response.ok) { res.status(response.status).json(data); return; }
  res.json(data?.[0] ?? null);
});

router.patch("/me", async (req, res): Promise<void> => {
  const accessToken = token(req);
  if (!accessToken) { res.status(401).json({ message: "Please sign in." }); return; }
  const userResponse = await supabaseRequest("/auth/v1/user", { method: "GET" }, accessToken);
  const user = userResponse.ok ? await responseJson(userResponse) : null;
  if (!user?.id) { res.status(401).json({ message: "Your session has expired." }); return; }
  const response = await supabaseRequest("/rest/v1/profiles?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ ...req.body, id: user.id }) }, accessToken);
  const data = await responseJson(response);
  if (!response.ok) { res.status(response.status).json(data); return; }
  res.json(data?.[0] ?? data);
});

export default router;
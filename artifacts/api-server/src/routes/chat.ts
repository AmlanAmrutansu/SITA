import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";

const router: IRouter = Router();

router.post("/chat", async (req: Request, res) => {
  const accessToken = req.cookies?.sita_access_token as string | undefined;
  if (!accessToken) return res.status(401).json({ message: "Please sign in." });
  const text = String(req.body?.text ?? "").trim();
  if (!text) return res.status(400).json({ message: "Message cannot be empty." });

  const messagesResponse = await supabaseRequest("/rest/v1/chat_messages?select=role,content&order=created_at.asc&limit=20", { method: "GET" }, accessToken);
  const history = messagesResponse.ok ? await responseJson(messagesResponse) : [];
  const contents = [...history, { role: "user", content: text }].map((message: any) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
  const prompt = "You are SITA, a warm women's health education companion. Be supportive, concise, non-judgmental, and never diagnose. Ask a clarifying question when useful. For severe, sudden, or concerning symptoms, recommend prompt professional care. Respond with plain text.";
  const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY ?? "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_instruction: { parts: [{ text: prompt }] }, contents }),
  });
  const aiData = await aiResponse.json() as any;
  if (!aiResponse.ok) return res.status(502).json({ message: "SITA is taking a quiet moment. Please try again." });
  const reply = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!reply) return res.status(502).json({ message: "SITA could not form a response." });

  await supabaseRequest("/rest/v1/chat_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([{ role: "user", content: text }, { role: "assistant", content: reply }]) }, accessToken);
  res.json({ reply });
});

export default router;
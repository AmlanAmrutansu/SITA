import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";
import { evaluatePCOS, evaluateSymptomTriage, type PCOSScreeningInput, type SymptomTriageInput } from "../lib/screening";

const router: IRouter = Router();
const access = (req: Request) => req.cookies?.sita_access_token as string | undefined;

async function getAuthenticatedUser(token: string) {
  const userResponse = await supabaseRequest("/auth/v1/user", { method: "GET" }, token);
  if (!userResponse.ok) return null;
  return responseJson(userResponse);
}

async function callGemini(systemInstruction: string, contents: any[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return "SITA is currently running in local offline mode (GEMINI_API_KEY not configured). I am here to help you log and track your cycle, mood, and health markers safely.";
  }

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const aiResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text();
      console.warn("[SITA AI] Gemini API returned error:", errBody);
      return "SITA is taking a gentle pause. Please try your question again in a few moments.";
    }

    const aiData = (await aiResponse.json()) as any;
    const reply = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return (
      reply ||
      "I hear you. While I process your thoughts, remember to prioritize your rest, hydration, and well-being today."
    );
  } catch (err) {
    console.error("[SITA AI] Gemini fetch failed:", err);
    return "I am currently unable to reach my AI service. Please check your connection or try again shortly.";
  }
}

// 1. Unified SITA Chat Endpoint
router.post("/chat", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.status(401).json({ message: "Please sign in to chat with SITA." });
    return;
  }

  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    res.status(401).json({ message: "Your session has expired." });
    return;
  }

  const text = String(req.body?.text ?? "").trim();
  if (!text) {
    res.status(400).json({ message: "Message cannot be empty." });
    return;
  }

  // Fetch contextual user data securely (RLS guarantees only this user's data is accessed)
  const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes] = await Promise.all([
    supabaseRequest("/rest/v1/profiles?select=*&limit=1", { method: "GET" }, token),
    supabaseRequest("/rest/v1/moods?select=mood,stress,energy,sleep,logged_at&order=logged_at.desc&limit=3", { method: "GET" }, token),
    supabaseRequest("/rest/v1/cycle_logs?select=period_date,flow,cramps,symptoms&order=period_date.desc&limit=5", { method: "GET" }, token),
    supabaseRequest("/rest/v1/pregnancy_data?select=*&limit=1", { method: "GET" }, token),
    supabaseRequest("/rest/v1/postpartum_data?select=*&limit=1", { method: "GET" }, token),
  ]);

  const profile = profileRes.ok ? (await responseJson(profileRes))?.[0] : null;
  const recentMoods = recentMoodsRes.ok ? await responseJson(recentMoodsRes) : [];
  const recentCycles = recentCyclesRes.ok ? await responseJson(recentCyclesRes) : [];
  const pregData = pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
  const postData = postRes.ok ? (await responseJson(postRes))?.[0] : null;

  const displayName = profile?.display_name || "friend";
  const mode = profile?.reproductive_mode || "not-pregnant";

  let userContext = `User Profile:\n- Name: ${displayName}\n- Reproductive Mode: ${mode}`;
  if (mode === "not-pregnant") {
    userContext += `\n- Typical cycle length: ${profile?.typical_cycle_length || 28} days\n- Typical period length: ${profile?.typical_period_length || 5} days\n- Last period: ${profile?.last_period_date || "not recorded"}`;
    if (recentCycles.length > 0) {
      userContext += `\n- Recent logged period dates: ${recentCycles.map((c: any) => `${c.period_date} (Flow: ${c.flow || "normal"}, Cramps: ${c.cramps ?? "n/a"}/10)`).join("; ")}`;
    }
  } else if (mode === "pregnant" && pregData) {
    userContext += `\n- Pregnancy Due Date: ${pregData.due_date || "not set"}\n- Kicks recorded: ${pregData.kick_count || 0}\n- Pregnancy symptoms: ${(pregData.symptoms || []).join(", ") || "none"}`;
  } else if (mode === "postpartum" && postData) {
    userContext += `\n- Childbirth date: ${postData.birth_date || "not set"}\n- Bleeding level: ${postData.bleeding_level || "not recorded"}\n- Recovery stage: ${postData.recovery_stage || "general"}\n- Sleep hours: ${postData.sleep_hours || "unspecified"}`;
  }

  if (recentMoods.length > 0) {
    userContext += `\n- Recent moods: ${recentMoods.map((m: any) => `${m.logged_at}: ${m.mood} (Stress ${m.stress}/10, Energy ${m.energy}/10)`).join("; ")}`;
  }
  if (profile?.health_notes) {
    userContext += `\n- User health notes: ${profile.health_notes}`;
  }

  const systemInstruction = `You are SITA (Smart Intelligence for Treatment & Awareness), a compassionate, knowledgeable women's health companion.

GUIDING PRINCIPLES:
1. Warmth & Empathy: Speak with gentle reassurance, active listening, and clear, supportive language. Use formatting like bullet points when helpful.
2. Non-Diagnostic: You provide health information, physiological context, lifestyle suggestions, and awareness. NEVER claim certainty or state "You have [Condition]". Always frame as possibilities (e.g. "Symptoms like these are commonly associated with...").
3. Safety & Urgency Recognition: For severe symptoms (unbearable sharp pain, soaking >2 pads/hr, postpartum fever, sudden vision changes, severe dizziness), gently but clearly advise in-person medical evaluation.
4. Personalized Context: Discreetly use the user's provided health context without regurgitating their data verbatim.
5. SITA Philosophy: "Simple for the user. Intelligent underneath." Keep replies concise, helpful, and under 3-4 short paragraphs unless a detailed guide is requested.

CURRENT USER CONTEXT:
${userContext}`;

  // Fetch recent conversation history from Supabase
  const messagesResponse = await supabaseRequest(
    "/rest/v1/chat_messages?select=role,content&order=created_at.asc&limit=16",
    { method: "GET" },
    token,
  );
  const history = messagesResponse.ok ? await responseJson(messagesResponse) : [];

  const contents = [...(history || []), { role: "user", content: text }].map((message: any) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const reply = await callGemini(systemInstruction, contents);

  // Persist both user message and assistant reply
  await supabaseRequest(
    "/rest/v1/chat_messages",
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([
        { user_id: user.id, role: "user", content: text },
        { user_id: user.id, role: "assistant", content: reply },
      ]),
    },
    token,
  ).catch(console.error);

  res.json({ reply });
});

// 2. Deterministic PCOS Screening + AI Explanation
router.post("/screening/pcos", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.status(401).json({ message: "Please sign in to take the PCOS screening." });
    return;
  }
  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    res.status(401).json({ message: "Your session has expired." });
    return;
  }

  const input: PCOSScreeningInput = req.body;
  const structuredResult = evaluatePCOS(input);

  const prompt = `As SITA, explain the following structured PCOS screening result gently and clearly to the user.
Structured Result:
- Risk Level: ${structuredResult.riskLevel}
- Score: ${structuredResult.score}
- Criteria Matched: ${structuredResult.criteriaMatched.join(", ") || "None"}
- Summary: ${structuredResult.summary}
- Recommendations: ${structuredResult.recommendations.join("; ")}

Explain that this is an awareness screening, not a definitive diagnosis, and highlight what questions they might bring to an OB/GYN or healthcare provider. Keep the tone calm, warm, and empowering.`;

  const explanation = await callGemini("You are SITA, a warm women's health companion.", [
    { role: "user", parts: [{ text: prompt }] },
  ]);

  // Persist screening result to Supabase
  await supabaseRequest(
    "/rest/v1/screening_sessions",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        screening_type: "pcos",
        answers: input,
        structured_result: structuredResult,
        risk_level: structuredResult.riskLevel,
        summary_explanation: explanation,
      }),
    },
    token,
  ).catch(console.error);

  res.json({ result: structuredResult, explanation });
});

// 3. Deterministic Symptom Triage + AI Explanation
router.post("/screening/triage", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.status(401).json({ message: "Please sign in to access symptom triage." });
    return;
  }
  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    res.status(401).json({ message: "Your session has expired." });
    return;
  }

  const input: SymptomTriageInput = req.body;
  const structuredResult = evaluateSymptomTriage(input);

  const prompt = `As SITA, provide a calm, reassuring breakdown of this symptom triage assessment:
- Symptom: ${input.symptom} (Duration: ${input.durationDays} days, Severity: ${input.severity})
- Category: ${structuredResult.category}
- Risk Level: ${structuredResult.riskLevel}
- Key Actions: ${structuredResult.actionSteps.join("; ")}

Provide comforting yet practical advice. If prompt evaluation is advised, explain gently why an in-person check is recommended.`;

  const explanation = await callGemini("You are SITA, a warm women's health companion.", [
    { role: "user", parts: [{ text: prompt }] },
  ]);

  // Persist triage session
  await supabaseRequest(
    "/rest/v1/screening_sessions",
    {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        screening_type: "symptom_triage",
        answers: input,
        structured_result: structuredResult,
        risk_level: structuredResult.riskLevel,
        summary_explanation: explanation,
      }),
    },
    token,
  ).catch(console.error);

  res.json({ result: structuredResult, explanation });
});

// 4. Chat history & conversation management
router.get("/chat/history", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.json({ messages: [] });
    return;
  }
  const response = await supabaseRequest(
    "/rest/v1/chat_messages?select=id,role,content,created_at&order=created_at.asc&limit=50",
    { method: "GET" },
    token,
  );
  if (!response.ok) {
    res.json({ messages: [] });
    return;
  }
  const messages = await responseJson(response);
  res.json({ messages });
});

router.delete("/chat/history", async (req: Request, res): Promise<void> => {
  const token = access(req);
  if (!token) {
    res.status(401).json({ message: "Please sign in." });
    return;
  }
  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    res.status(401).json({ message: "Session expired." });
    return;
  }
  await supabaseRequest(`/rest/v1/chat_messages?user_id=eq.${user.id}`, { method: "DELETE" }, token);
  res.json({ message: "Chat history cleared." });
});

export default router;

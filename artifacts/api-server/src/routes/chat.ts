import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";
import { evaluatePCOS, evaluateSymptomTriage, type PCOSScreeningInput, type SymptomTriageInput } from "../lib/screening";
import { generateSitaResponse } from "../lib/ai-service";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

const access = (req: Request) =>
  (req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : req.cookies?.sita_access_token) as string | undefined;

async function getAuthenticatedUser(token: string) {
  const userResponse = await supabaseRequest("/auth/v1/user", { method: "GET" }, token);
  if (!userResponse.ok) return null;
  return responseJson(userResponse);
}

// 1. Unified SITA Chat Endpoint
router.post("/chat", async (req: Request, res: any): Promise<void> => {
  const token = access(req);
  if (!token) {
    return res.status(401).json({ message: "Please sign in to chat with SITA." });
  }

  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    return res.status(401).json({ message: "Your session has expired." });
  }

  const text = String(req.body?.text ?? "").trim();
  const assessmentId = req.body?.assessmentId;
  if (!text) {
    return res.status(400).json({ message: "Message cannot be empty." });
  }

  try {
    // Fetch contextual user data securely (RLS guarantees only this user's data is accessed)
    const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes, screeningRes, symptomRes, specificScreeningRes, medicalRecordsRes] = await Promise.all([
      supabaseRequest("/rest/v1/profiles?select=*&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/moods?select=mood,stress,energy,sleep,logged_at&order=logged_at.desc&limit=3", { method: "GET" }, token),
      supabaseRequest("/rest/v1/cycle_logs?select=period_date,flow,cramps,symptoms&order=period_date.desc&limit=5", { method: "GET" }, token),
      supabaseRequest("/rest/v1/pregnancy_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/postpartum_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/screening_sessions?select=*&order=created_at.desc&limit=2", { method: "GET" }, token),
      supabaseRequest("/rest/v1/symptom_logs?select=symptom,category,severity,logged_at&order=logged_at.desc&limit=5", { method: "GET" }, token),
      assessmentId ? supabaseRequest(`/rest/v1/screening_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=*`, { method: "GET" }, token) : Promise.resolve(null),
      supabaseRequest("/rest/v1/medical_records?select=title,document_type,document_date,structured_data&order=document_date.desc&limit=5", { method: "GET" }, token),
    ]);

    const profile = profileRes.ok ? (await responseJson(profileRes))?.[0] : null;
    const recentMoods = recentMoodsRes.ok ? await responseJson(recentMoodsRes) : [];
    const recentCycles = recentCyclesRes.ok ? await responseJson(recentCyclesRes) : [];
    const pregData = pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
    const recentSymptoms = (symptomRes && symptomRes.ok) ? await responseJson(symptomRes) : [];
    const medicalRecords = (medicalRecordsRes && medicalRecordsRes.ok) ? await responseJson(medicalRecordsRes) : [];
    const specificScreening = (specificScreeningRes && specificScreeningRes.ok) ? (await responseJson(specificScreeningRes))?.[0] : null;
    const postData = postRes.ok ? (await responseJson(postRes))?.[0] : null;
    const recentScreenings = (screeningRes && screeningRes.ok) ? await responseJson(screeningRes) : [];

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

    if (recentSymptoms.length > 0) {
      userContext += `\n- Recent symptoms logged:\n`;
      recentSymptoms.forEach((s: any) => {
        userContext += `  * ${s.symptom} (Category: ${s.category || 'General'}, Severity: ${s.severity || 'Unspecified'}, Date: ${s.logged_at})\n`;
      });
    }
    if (recentMoods.length > 0) {
      userContext += `\n- Recent moods: ${recentMoods.map((m: any) => `${m.logged_at}: ${m.mood} (Stress ${m.stress}/10, Energy ${m.energy}/10)`).join("; ")}`;
    }

    if (recentScreenings && recentScreenings.length > 0) {
      userContext += `\n- Recent health assessments:\n`;
      recentScreenings.forEach((s: any) => {
        userContext += `  * ${s.screening_type} (ID: ${s.id}, Date: ${s.created_at}): Risk Level: ${s.risk_level}. Summary: ${s.summary_explanation || ""}\n`;
      });
    }

    if (profile?.health_notes) {
      userContext += `\n- User health notes: ${profile.health_notes}`;
    }

    if (medicalRecords && medicalRecords.length > 0) {
      userContext += `\n- Recent Medical Records / Documents:\n`;
      medicalRecords.forEach((r) => {
        userContext += `  * Title: ${r.title} (${r.document_type}, Date: ${r.document_date})\n`;
        if (r.structured_data) {
          if (r.structured_data.medicines && r.structured_data.medicines.length > 0) {
            userContext += `    - Medicines: ${r.structured_data.medicines.join(', ')}\n`;
          }
          if (r.structured_data.doctor_name) {
            userContext += `    - Doctor: ${r.structured_data.doctor_name}\n`;
          }
          if (r.structured_data.notes) {
            userContext += `    - Notes: ${r.structured_data.notes}\n`;
          }
        }
      });
    }


    
    if (specificScreening) {
      userContext += `\n\n[ACTIVE ASSESSMENT SUBMISSION]:\nThe user has just completed a specific assessment and is asking about it. Use this detailed data for your response:\n- Assessment ID: ${specificScreening.id}\n- Type: ${specificScreening.screening_type}\n- Risk Level: ${specificScreening.risk_level}\n- AI Summary generated at time of assessment: ${specificScreening.summary_explanation}\n- Raw Data: ${JSON.stringify(specificScreening.structured_result)}\n`;
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

    const reply = await generateSitaResponse(systemInstruction, contents);

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
    );
    res.json({ reply });
  } catch (error: any) {
    const requestId = randomUUID();
    console.error(`[Error - ${requestId}]:`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");
    
    let code = "AI_PROVIDER_ERROR";
    let message = "SITA could not reach the AI service right now.";
    let status = 500;
    
    if (isConfigError) {
      code = "AI_PROVIDER_NOT_CONFIGURED";
      message = "GROQ_API_KEY is not configured.";
      status = 503;
    } else if (isModelUnavailable) {
      code = "AI_MODEL_UNAVAILABLE";
      message = "The selected AI model is currently unavailable or decommissioned. Please try again later or contact support.";
      status = 503;
    }
    
    res.status(status).json({
      success: false,
      requestId,
      code,
      message
    });
  }
});

// 2. Deterministic PCOS Screening + AI Explanation
router.post("/screening/pcos", async (req: Request, res: any): Promise<void> => {
  try {
    const token = access(req);
    if (!token) {
      return res.status(401).json({ message: "Please sign in to take the PCOS screening." });
    }

    const user = await getAuthenticatedUser(token);
    if (!user?.id) {
      return res.status(401).json({ message: "Your session has expired." });
    }

    const input: PCOSScreeningInput = req.body;
    const structuredResult = evaluatePCOS(input);

const explanation = "Your assessment has been saved. SITA is ready to discuss the results.";

    // Persist screening result to Supabase
    const insertRes = await supabaseRequest(
      "/rest/v1/screening_sessions",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: user.id,
          screening_type: "pcos",
          answers: input,
          structured_result: structuredResult,
          risk_level: structuredResult.riskLevel,
          summary_explanation: "Assessment completed",
        }),
      },
      token
    );
    let id = null;
    if (insertRes.ok) {
      const data = await insertRes.json();
      if (data && data.length > 0) id = data[0].id;
    }
    res.json({ result: structuredResult, explanation, id });
  } catch (error: any) {
    const requestId = randomUUID();
    console.error(`[Error - ${requestId}]:`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");
    
    let code = "AI_PROVIDER_ERROR";
    let message = "SITA could not reach the AI service right now.";
    let status = 500;
    
    if (isConfigError) {
      code = "AI_PROVIDER_NOT_CONFIGURED";
      message = "GROQ_API_KEY is not configured.";
      status = 503;
    } else if (isModelUnavailable) {
      code = "AI_MODEL_UNAVAILABLE";
      message = "The selected AI model is currently unavailable or decommissioned. Please try again later or contact support.";
      status = 503;
    }
    
    res.status(status).json({
      success: false,
      requestId,
      code,
      message
    });
  }
});

// 3. Deterministic Symptom Triage + AI Explanation
router.post("/screening/triage", async (req: Request, res: any): Promise<void> => {
  try {
    const token = access(req);
    if (!token) {
      return res.status(401).json({ message: "Please sign in to access symptom triage." });
    }

    const user = await getAuthenticatedUser(token);
    if (!user?.id) {
      return res.status(401).json({ message: "Your session has expired." });
    }

    const input: SymptomTriageInput = req.body;
    const structuredResult = evaluateSymptomTriage(input);

const explanation = "Your symptom triage has been saved. SITA is ready to discuss the results.";

    // Persist triage session
    const insertRes = await supabaseRequest(
      "/rest/v1/screening_sessions",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          user_id: user.id,
          screening_type: "symptom_triage",
          answers: input,
          structured_result: structuredResult,
          risk_level: structuredResult.riskLevel,
          summary_explanation: "Assessment completed",
        }),
      },
      token
    );
    let id = null;
    if (insertRes.ok) {
      const data = await insertRes.json();
      if (data && data.length > 0) id = data[0].id;
    }
    res.json({ result: structuredResult, explanation, id });
  } catch (error: any) {
    const requestId = randomUUID();
    console.error(`[Error - ${requestId}]:`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");
    
    let code = "AI_PROVIDER_ERROR";
    let message = "SITA could not reach the AI service right now.";
    let status = 500;
    
    if (isConfigError) {
      code = "AI_PROVIDER_NOT_CONFIGURED";
      message = "GROQ_API_KEY is not configured.";
      status = 503;
    } else if (isModelUnavailable) {
      code = "AI_MODEL_UNAVAILABLE";
      message = "The selected AI model is currently unavailable or decommissioned. Please try again later or contact support.";
      status = 503;
    }
    
    res.status(status).json({
      success: false,
      requestId,
      code,
      message
    });
  }
});

// 4. Chat history & conversation management
router.get("/chat/history", async (req: Request, res: any): Promise<void> => {
  const token = access(req);
  if (!token) {
    return res.json({ messages: [] });
  }

  const response = await supabaseRequest(
    "/rest/v1/chat_messages?select=id,role,content,created_at&order=created_at.asc&limit=50",
    { method: "GET" },
    token,
  );
  if (!response.ok) {
    return res.json({ messages: [] });
  }

  const messages = await responseJson(response);
  res.json({ messages });
});

router.delete("/chat/history", async (req: Request, res: any): Promise<void> => {
  const token = access(req);
  if (!token) {
    return res.status(401).json({ message: "Please sign in." });
  }
  const user = await getAuthenticatedUser(token);
  if (!user?.id) {
    return res.status(401).json({ message: "Session expired." });
  }

  await supabaseRequest(`/rest/v1/chat_messages?user_id=eq.${user.id}`, { method: "DELETE" }, token);
  res.json({ message: "Chat history cleared." });
});

export default router;

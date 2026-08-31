import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";
import { evaluatePCOS, evaluateSymptomTriage, type PCOSScreeningInput, type SymptomTriageInput } from "../lib/screening";
import { generateSitaResponse } from "../lib/ai-service";
import { randomUUID } from "node:crypto";
import { createWorker } from "tesseract.js";

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

// 1. Unified SITA Chat Endpoint (Supports text, attached medical images, and assessments)
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
  const imageBase64 = req.body?.imageBase64 || req.body?.image;
  const assessmentId = req.body?.assessmentId;

  if (!text && !imageBase64) {
    return res.status(400).json({ message: "Message or image cannot be empty." });
  }

  try {
    let extractedDoc: any = null;
    let imageOcrText = "";

    // If an image was attached, perform OCR and medical extraction
    if (imageBase64) {
      try {
        const worker = await createWorker("eng");
        const ret = await worker.recognize(imageBase64);
        imageOcrText = ret.data.text.trim();
        await worker.terminate();

        if (imageOcrText && imageOcrText.length > 5) {
          const extractionPrompt = `You are SITA's specialized Clinical Medical Document Extraction Assistant.
Analyze the following raw OCR text extracted from a medical record, prescription, or lab report.
Extract structured data and return strictly a valid JSON object matching the schema below.
CRITICAL RULES:
- Never hallucinate or invent medications or test values not present in the text.
- If a value cannot be determined, set it to null or leave the list empty.
- Normalize medication frequency (e.g. "Once daily", "Twice daily", "At bedtime").
- Return ONLY the raw JSON object, without markdown wrapping.

JSON Schema:
{
  "title": "string (Concise title e.g. 'Prescription - Dr. Mehta' or 'Blood Lab Report')",
  "document_type": "Prescription | Lab Report | Ultrasound Report | Doctor Note | Discharge Summary | Blood Report | Other",
  "document_date": "YYYY-MM-DD (format if identifiable, else current date string)",
  "doctor_name": "string | null",
  "hospital_name": "string | null",
  "diagnoses": ["string"],
  "symptoms": ["string"],
  "medications": [
    {
      "name": "string",
      "dosage": "string (e.g. '500mg', '100mcg')",
      "frequency": "string (e.g. 'Once daily after breakfast', 'Twice daily')",
      "duration": "string (e.g. '14 days', '1 month')",
      "instructions": "string (e.g. 'Take with warm water')"
    }
  ],
  "investigations": ["string"],
  "lab_results": [
    {
      "test_name": "string",
      "value": "string",
      "numeric_value": "number | null",
      "unit": "string",
      "reference_range": "string",
      "flag": "normal | low | high | abnormal | borderline | null"
    }
  ],
  "important_findings": ["string"],
  "notes": "string",
  "confidence": "high | medium | low"
}

Raw Document Text:
${imageOcrText}`;

          try {
            const jsonString = await generateSitaResponse(extractionPrompt, [
              { role: "user", parts: [{ text: "Extract medical JSON." }] },
            ]);
            const cleaned = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            extractedDoc = {
              extracted_text: imageOcrText,
              structured_data: parsed,
              requires_confirmation: true,
            };
          } catch (pErr) {
            console.warn("[Document structuring fallback]:", pErr);
            extractedDoc = {
              extracted_text: imageOcrText,
              structured_data: {
                title: "Uploaded Medical Document",
                document_type: "Medical Record",
                document_date: new Date().toISOString().split("T")[0],
                diagnoses: [],
                symptoms: [],
                medications: [],
                investigations: [],
                lab_results: [],
                important_findings: [],
                notes: imageOcrText.slice(0, 300),
                confidence: "medium",
              },
              requires_confirmation: true,
            };
          }
        }
      } catch (ocrErr) {
        console.warn("[OCR extraction failed]:", ocrErr);
      }
    }

    // Fetch contextual user data securely (RLS guarantees only this user's data is accessed)
    const [
      profileRes,
      recentMoodsRes,
      recentCyclesRes,
      pregRes,
      postRes,
      screeningRes,
      symptomRes,
      specificScreeningRes,
      medicalRecordsRes,
      medicalDocsRes,
    ] = await Promise.all([
      supabaseRequest("/rest/v1/profiles?select=*&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/moods?select=mood,stress,energy,sleep,logged_at&order=logged_at.desc&limit=3", { method: "GET" }, token),
      supabaseRequest("/rest/v1/cycle_logs?select=period_date,flow,cramps,symptoms&order=period_date.desc&limit=5", { method: "GET" }, token),
      supabaseRequest("/rest/v1/pregnancy_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/postpartum_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),
      supabaseRequest("/rest/v1/screening_sessions?select=*&order=created_at.desc&limit=3", { method: "GET" }, token),
      supabaseRequest("/rest/v1/symptom_logs?select=symptom,category,severity,logged_at&order=logged_at.desc&limit=5", { method: "GET" }, token),
      assessmentId ? supabaseRequest(`/rest/v1/screening_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=*`, { method: "GET" }, token) : Promise.resolve(null),
      supabaseRequest("/rest/v1/medical_records?select=*&order=document_date.desc&limit=10", { method: "GET" }, token),
      supabaseRequest("/rest/v1/medical_documents?select=*&order=document_date.desc&limit=10", { method: "GET" }, token),
    ]);

    const profile = profileRes.ok ? (await responseJson(profileRes))?.[0] : null;
    const recentMoods = recentMoodsRes.ok ? await responseJson(recentMoodsRes) : [];
    const recentCycles = recentCyclesRes.ok ? await responseJson(recentCyclesRes) : [];
    const pregData = pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
    const postData = postRes.ok ? (await responseJson(postRes))?.[0] : null;
    const recentSymptoms = (symptomRes && symptomRes.ok) ? await responseJson(symptomRes) : [];
    const recentScreenings = (screeningRes && screeningRes.ok) ? await responseJson(screeningRes) : [];
    const specificScreening = (specificScreeningRes && specificScreeningRes.ok) ? (await responseJson(specificScreeningRes))?.[0] : null;
    
    // Combine medical records from both tables for complete longitudinal memory
    const rawRecords = (medicalRecordsRes && medicalRecordsRes.ok) ? await responseJson(medicalRecordsRes) : [];
    const rawDocs = (medicalDocsRes && medicalDocsRes.ok) ? await responseJson(medicalDocsRes) : [];
    const medicalRecords = [...rawRecords, ...rawDocs.filter((d: any) => !rawRecords.some((r: any) => r.id === d.id))];

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
      userContext += `\n- SITA Health Memory (Confirmed Longitudinal Medical Documents & Records):\n`;
      medicalRecords.forEach((r: any) => {
        userContext += `  * Document: "${r.title}" (${r.document_type || "Medical Record"}, Date: ${r.document_date}${r.doctor_name ? `, Doctor: ${r.doctor_name}` : ""}${r.hospital_name ? `, Clinic/Hospital: ${r.hospital_name}` : ""})\n`;
        const data = r.structured_data || {};
        if (data.diagnoses && data.diagnoses.length > 0) {
          userContext += `    - Diagnoses / Impressions: ${data.diagnoses.join(", ")}\n`;
        }
        if (data.medications && data.medications.length > 0) {
          const medsFormatted = data.medications.map((m: any) => typeof m === "string" ? m : `${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` (${m.frequency})` : ""}${m.duration ? ` for ${m.duration}` : ""}`).join("; ");
          userContext += `    - Medications Prescribed: ${medsFormatted}\n`;
        } else if (data.medicines && data.medicines.length > 0) {
          userContext += `    - Medications: ${data.medicines.join(", ")}\n`;
        }
        if (data.lab_results && data.lab_results.length > 0) {
          const labsFormatted = data.lab_results.map((l: any) => `${l.test_name}: ${l.value}${l.unit ? ` ${l.unit}` : ""}${l.reference_range ? ` (Ref: ${l.reference_range})` : ""}`).join("; ");
          userContext += `    - Lab Results: ${labsFormatted}\n`;
        }
        if (data.important_findings && data.important_findings.length > 0) {
          userContext += `    - Key Findings: ${data.important_findings.join("; ")}\n`;
        }
        if (data.notes) {
          userContext += `    - Doctor Notes & Advice: ${data.notes}\n`;
        }
      });
    }

    if (extractedDoc) {
      userContext += `\n\n[NEW IMAGE / MEDICAL DOCUMENT ATTACHED IN THIS MESSAGE]:\nThe user has uploaded an image of a medical document. Extracted details:\n${JSON.stringify(extractedDoc.structured_data, null, 2)}\nOCR Text: ${extractedDoc.extracted_text}\nExplain the findings clearly, warmly, and helpfully to the user. Inform them that an editable verification card is shown below for them to review and confirm before saving to their Health Memory.`;
    }

    if (specificScreening) {
      userContext += `\n\n[ACTIVE ASSESSMENT SUBMISSION]:\nThe user has just completed a specific assessment and is asking about it. Use this detailed data for your response:\n- Assessment ID: ${specificScreening.id}\n- Type: ${specificScreening.screening_type}\n- Risk Level: ${specificScreening.risk_level}\n- AI Summary generated at time of assessment: ${specificScreening.summary_explanation}\n- Raw Data: ${JSON.stringify(specificScreening.structured_result)}\n`;
    }

    const systemInstruction = `You are SITA (Smart Intelligence for Treatment & Awareness), a compassionate, knowledgeable women's health companion.
GUIDING PRINCIPLES:
1. Warmth & Empathy: Speak with gentle reassurance, active listening, and clear, supportive language. Use rich formatting like bold text, bullet points, or numbered steps when organizing medical explanations.
2. Non-Diagnostic: You provide health information, physiological context, lifestyle suggestions, and awareness. NEVER claim certainty or state "You have [Condition]". Always frame as possibilities (e.g. "Symptoms like these are commonly associated with...").
3. Safety & Urgency Recognition: For severe symptoms (unbearable sharp pain, soaking >2 pads/hr, postpartum fever, sudden vision changes, severe dizziness), gently but clearly advise in-person medical evaluation.
4. Longitudinal Health Memory: Seamlessly and accurately reference the user's past medical records, cycle logs, lab values, and symptom trends from their verified records when answering questions (e.g. comparing past hemoglobin to current, or recalling active medications).
5. SITA Philosophy: "Simple for the user. Intelligent underneath." Keep replies concise, structured, helpful, and under 3-4 short paragraphs unless a comprehensive breakdown is requested.

CURRENT USER CONTEXT:
${userContext}`;

    // Fetch recent conversation history from Supabase
    const messagesResponse = await supabaseRequest(
      "/rest/v1/chat_messages?select=role,content&order=created_at.asc&limit=16",
      { method: "GET" },
      token,
    );
    const history = messagesResponse.ok ? await responseJson(messagesResponse) : [];

    const effectiveUserContent = text || (extractedDoc ? "I have attached an image of a medical document. Please review it." : "Attached image.");

    const contents = [...(history || []), { role: "user", content: effectiveUserContent }].map((message: any) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    const reply = await generateSitaResponse(systemInstruction, contents);

    // Persist user message and assistant reply to chat_messages with metadata
    const userMsgMetadata = imageBase64 ? { has_image: true, image_preview: imageBase64.slice(0, 500) } : {};
    
    await supabaseRequest(
      "/rest/v1/chat_messages",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify([
          { user_id: user.id, role: "user", content: effectiveUserContent, metadata: userMsgMetadata },
          { user_id: user.id, role: "assistant", content: reply, metadata: extractedDoc ? { extracted_document: extractedDoc } : {} },
        ]),
      },
      token,
    );

    res.json({ reply, extracted_document: extractedDoc });
  } catch (error: any) {
    const requestId = randomUUID();
    console.error(`[Error - ${requestId}]:`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");
    
    let code = "AI_PROVIDER_ERROR";
    let message = "SITA could not reach the AI service right now. Please try again.";
    let status = 500;
    
    if (isConfigError) {
      code = "AI_PROVIDER_NOT_CONFIGURED";
      message = "GROQ_API_KEY is not configured.";
      status = 503;
    } else if (isModelUnavailable) {
      code = "AI_MODEL_UNAVAILABLE";
      message = "The selected AI model is currently unavailable. Please try again in a moment.";
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
    const assessmentUuid = randomUUID();

    // Persist screening result to Supabase ensuring a non-null UUID
    const insertRes = await supabaseRequest(
      "/rest/v1/screening_sessions",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: assessmentUuid,
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

    let id = assessmentUuid;
    if (insertRes.ok) {
      const data = await insertRes.json().catch(() => null);
      if (data && data.length > 0 && data[0].id) {
        id = data[0].id;
      }
    }

    res.json({ result: structuredResult, explanation, id });
  } catch (error: any) {
    const requestId = randomUUID();
    console.error(`[Error - ${requestId}]:`, error);
    res.status(500).json({
      success: false,
      requestId,
      code: "ASSESSMENT_ERROR",
      message: "Could not evaluate PCOS screening."
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
    const triageUuid = randomUUID();

    // Persist triage session ensuring a non-null UUID
    const insertRes = await supabaseRequest(
      "/rest/v1/screening_sessions",
      {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          id: triageUuid,
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

    let id = triageUuid;
    if (insertRes.ok) {
      const data = await insertRes.json().catch(() => null);
      if (data && data.length > 0 && data[0].id) {
        id = data[0].id;
      }
    }

    res.json({ result: structuredResult, explanation, id });
  } catch (error: any) {
    const requestId = randomUUID();
    console.error(`[Error - ${requestId}]:`, error);
    res.status(500).json({
      success: false,
      requestId,
      code: "ASSESSMENT_ERROR",
      message: "Could not evaluate symptom triage."
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
    "/rest/v1/chat_messages?select=id,role,content,metadata,created_at&order=created_at.asc&limit=50",
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


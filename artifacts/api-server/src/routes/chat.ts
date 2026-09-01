import { Router, type IRouter, type Request } from "express";
import { responseJson, supabaseRequest } from "../lib/supabase";
import { evaluatePCOS, evaluateSymptomTriage, type PCOSScreeningInput, type SymptomTriageInput } from "../lib/screening";
import { generateSitaResponse, extractStructuredMedicalDocument } from "../lib/ai-service";
import { retrievePersonalHealthMemoryRAG } from "../lib/health-memory";
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

// 1. Unified SITA Chat Endpoint with Smart Database Retrieval & Multilingual Vision
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

    // 1. Multimodal Vision & Regional Language Document Extraction
    if (imageBase64) {
      try {
        const extraction = await extractStructuredMedicalDocument(imageBase64, text);
        if (extraction && extraction.structured_data) {
          extractedDoc = {
            extracted_text: extraction.extracted_text,
            structured_data: extraction.structured_data,
            requires_confirmation: false,
            is_saved: true,
          };

          // Automatically persist to Supabase medical records table under authenticated user.id
          try {
            const savePayload = {
              user_id: user.id,
              title: extraction.structured_data.title || "Uploaded Medical Document",
              document_type: extraction.structured_data.document_type || "Medical Record",
              document_date: extraction.structured_data.document_date || new Date().toISOString().split("T")[0],
              doctor_name: extraction.structured_data.doctor_name || null,
              hospital_name: extraction.structured_data.hospital_name || null,
              extracted_text: extraction.extracted_text || "",
              structured_data: extraction.structured_data,
              verification_status: "verified",
            };

            const insertRes = await supabaseRequest(
              "/rest/v1/medical_records",
              {
                method: "POST",
                headers: { Prefer: "return=representation" },
                body: JSON.stringify(savePayload),
              },
              token
            );

            if (insertRes && insertRes.ok) {
              const savedRecord = (await responseJson(insertRes))?.[0];
              if (savedRecord?.id) {
                extractedDoc.id = savedRecord.id;
              }
            }
          } catch (saveErr) {
            console.warn("[Auto-persist medical record to Supabase]:", saveErr);
          }
        }
      } catch (extractErr) {
        console.warn("[Multimodal extraction pipeline error]:", extractErr);
      }
    }

    // 2. Personal Health Memory RAG Layer (Deterministic query classification + RLS-isolated scoped retrieval)
    const ragResult = await retrievePersonalHealthMemoryRAG(token, text, {
      assessmentId,
      extractedDoc,
    });
    const intents = ragResult.intents;
    const relevanceSummary = ragResult.relevanceSummary;

    // 3. Compose Safety-Grounded System Instruction with Compact RAG Context
    const systemInstruction = `You are SITA, an empathetic women's health companion with SITA Personal Health Memory.
- Grounding: When answering about cycle, symptoms, medications, or lab values, cite the user's confirmed records.
- Zero Hallucination: State only facts in the user's records. Do not invent dates or values.
- Safety: Provide educational support and empathetic guidance; never declare definitive diagnoses. Advise in-person medical care for red flags (severe pain, hemorrhage, high fever).
- Tone: Warm, clear, concise, and clinically responsible.

${ragResult.contextPrompt}`;

    // 6. Fetch recent conversation history from Supabase (Limit to 6 most recent, chronological)
    let history: any[] = [];
    try {
      const messagesResponse = await supabaseRequest(
        "/rest/v1/chat_messages?select=role,content&order=created_at.desc&limit=6",
        { method: "GET" },
        token
      );
      if (messagesResponse && messagesResponse.ok) {
        const histData = await responseJson(messagesResponse);
        if (Array.isArray(histData)) {
          // Reverse back to chronological order (asc)
          history = histData.reverse().map((m: any) => {
            let content = typeof m.content === "string" ? m.content : "";
            // Compact long previous assistant messages to save tokens for current query
            if (m.role === "assistant" && content.length > 300) {
              content = content.slice(0, 300) + "...";
            }
            return {
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: content }],
            };
          });
        }
      }
    } catch (histErr) {
      console.warn("[SITA chat history fetch warning]:", histErr);
    }

    const effectiveUserContent = text || (extractedDoc ? `I have uploaded a medical document (${extractedDoc.structured_data.title || "Prescription"}). Please review and explain the medications and findings.` : "Uploaded document image.");

    const contents = [...history, { role: "user", parts: [{ text: effectiveUserContent }] }];

    // 7. Generate Grounded AI Response via Groq
    const reply = await generateSitaResponse(systemInstruction, contents);

    // 8. Safely persist user message and assistant reply without failing if table is unavailable
    try {
      const userMsgMetadata = imageBase64 ? { has_image: true, image_preview: imageBase64 } : {};
      await supabaseRequest(
        "/rest/v1/chat_messages",
        {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify([
            { user_id: user.id, role: "user", content: effectiveUserContent, metadata: userMsgMetadata },
            {
              user_id: user.id,
              role: "assistant",
              content: reply,
              metadata: {
                relevance_summary: relevanceSummary,
                intents_classified: intents,
                extracted_document: extractedDoc || undefined,
              },
            },
          ]),
        },
        token
      );
    } catch (persistErr) {
      console.warn("[SITA chat message persistence warning]:", persistErr);
    }

    console.log(`[ SITA GROQ DEBUG ]\nBackend response status: 200\nBackend response JSON structure: { success: true, reply, response, message, extracted_document, retrieval_meta }\nAssistant content extracted: true\nExact failure stage: none`);

    res.json({
      success: true,
      reply,
      response: reply,
      message: reply,
      extracted_document: extractedDoc,
      retrieval_meta: {
        intents,
        relevance_summary: relevanceSummary,
      },
    });
  } catch (error: any) {
    const requestId = randomUUID();
    const errMsg = String(error?.message || "");
    const errStatus = error?.status || (error?.statusCode ? Number(error.statusCode) : undefined);

    let code = "AI_PROVIDER_ERROR";
    let message = "SITA could not reach the AI service right now. Please try again.";
    let status = 500;

    if (errMsg.includes("AI_PROVIDER_NOT_CONFIGURED") || !process.env.GROQ_API_KEY) {
      code = "AI_PROVIDER_NOT_CONFIGURED";
      message = "GROQ_API_KEY is not configured in the server environment.";
      status = 503;
    } else if (errStatus === 401 || errMsg.includes("401") || errMsg.includes("Invalid API Key") || errMsg.includes("invalid_api_key")) {
      code = "AI_AUTH_ERROR";
      message = "AI service authentication failed. Please check your Groq API key configuration.";
      status = 502;
    } else if (errStatus === 429 || errMsg.includes("429") || errMsg.toLowerCase().includes("rate limit")) {
      code = "AI_RATE_LIMIT";
      message = "SITA is currently experiencing high demand. Please wait a moment and try again.";
      status = 429;
    } else if (errStatus === 503 || errStatus === 502 || errMsg.includes("503") || errMsg.includes("502") || errMsg.includes("AI_MODEL_UNAVAILABLE")) {
      code = "AI_UPSTREAM_BUSY";
      message = "The AI service is temporarily busy. Please try again in a moment.";
      status = 503;
    } else if (errMsg.includes("session has expired") || errMsg.includes("Please sign in")) {
      code = "AUTH_EXPIRED";
      message = "Your session has expired. Please sign in again to continue.";
      status = 401;
    }

    console.error(`[ SITA GROQ DEBUG ]\nBackend response status: ${status}\nExact failure stage: pipeline execution\nError code: ${code}\nError message: ${errMsg}`);

    res.status(status).json({
      success: false,
      requestId,
      code,
      message,
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

    // Persist screening result to Supabase
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
          summary_explanation: structuredResult.summary,
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
      message: "Could not evaluate PCOS screening.",
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

    // Persist triage session
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
          summary_explanation: structuredResult.summary,
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
      message: "Could not evaluate symptom triage.",
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
    token
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

export interface StructuredMedication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface StructuredLabResult {
  test_name: string;
  value: string;
  numeric_value?: number | null;
  unit?: string;
  reference_range?: string;
  flag?: "normal" | "low" | "high" | "abnormal" | "borderline" | null;
  recorded_at?: string;
}

export interface StructuredMedicalRecord {
  title: string;
  document_type: string;
  document_date: string;
  detected_language?: string;
  detected_script?: string;
  original_text?: string;
  normalized_english_text?: string;
  doctor_name?: string | null;
  hospital_name?: string | null;
  diagnoses: string[];
  symptoms: string[];
  medications: StructuredMedication[];
  investigations: string[];
  lab_results: StructuredLabResult[];
  important_findings: string[];
  notes?: string;
  handwriting_notes?: string;
  confidence?: "high" | "medium" | "low";
}

const FALLBACK_TEXT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
];

const VISION_MODELS = [
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
];

function getMaskedKeyFingerprint(key?: string): string {
  if (!key) return "missing";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return `present (${trimmed.length} chars)`;
  const prefix = trimmed.slice(0, 6);
  const suffix = trimmed.slice(-4);
  return `${prefix}...${suffix} (len: ${trimmed.length})`;
}

/**
 * Fast, conservative token estimator (~3.8 characters per token for English & medical text)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 3.8));
}

export interface ContextBreakdown {
  model: string;
  systemPromptTokens: number;
  healthContextTokens: number;
  conversationTokens: number;
  documentOcrTokens: number;
  userQueryTokens: number;
  totalEstimatedTokens: number;
  contextReductionApplied: string;
  finalContextSizeTokens: number;
}

/**
 * Deterministically compacts messages and system instructions to fit within target input token budget
 */
function compactContextForBudget(
  systemInstruction: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxBudget = 4500
): {
  compactedSystem: string;
  compactedMessages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  reductionNote: string;
} {
  let reductionNotes: string[] = [];
  let currentSystem = systemInstruction;
  let currentMessages = [...messages];

  const calcTotal = () => {
    let total = estimateTokens(currentSystem);
    for (const m of currentMessages) {
      total += estimateTokens(m.content);
    }
    return total;
  };

  let total = calcTotal();
  if (total <= maxBudget) {
    return {
      compactedSystem: currentSystem,
      compactedMessages: currentMessages,
      reductionNote: "None (within safe token budget)",
    };
  }

  // Reduction Step 1: Limit past conversation turns (keep last 3 messages)
  if (currentMessages.length > 3) {
    const lastUserMsg = currentMessages[currentMessages.length - 1];
    const prevTurn = currentMessages.slice(-3, -1);
    currentMessages = [...prevTurn, lastUserMsg];
    reductionNotes.push("Trimmed older conversation history to last 2 turns");
  }

  // Reduction Step 2: Compact past assistant messages in remaining history
  currentMessages = currentMessages.map((m, idx) => {
    if (m.role === "assistant" && idx < currentMessages.length - 1 && m.content.length > 200) {
      return { ...m, content: m.content.slice(0, 200) + "..." };
    }
    return m;
  });

  total = calcTotal();
  if (total <= maxBudget) {
    return {
      compactedSystem: currentSystem,
      compactedMessages: currentMessages,
      reductionNote: reductionNotes.join("; ") || "Compacted history",
    };
  }

  // Reduction Step 3: Compact health memory in system instruction
  if (currentSystem.includes("=== SITA PERSONAL HEALTH MEMORY")) {
    const parts = currentSystem.split("=== SITA PERSONAL HEALTH MEMORY");
    const baseInst = parts[0];
    const memoryPart = parts[1] || "";
    // Truncate memory part to top 800 chars
    const compactedMemory = memoryPart.slice(0, 800) + "\n[Older health records omitted to maintain safe context budget]";
    currentSystem = `${baseInst}=== SITA PERSONAL HEALTH MEMORY${compactedMemory}`;
    reductionNotes.push("Compressed health context to primary records");
  }

  // Reduction Step 4: If still over budget, retain only the immediate user query
  total = calcTotal();
  if (total > maxBudget && currentMessages.length > 1) {
    currentMessages = [currentMessages[currentMessages.length - 1]];
    reductionNotes.push("Retained only current user query");
  }

  return {
    compactedSystem: currentSystem,
    compactedMessages: currentMessages,
    reductionNote: reductionNotes.join("; ") || "Context compacted for token budget",
  };
}

export async function generateSitaResponse(
  systemInstruction: string,
  contents: any[],
  preferredModel?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error(`[SITA CONTEXT DEBUG]\nStatus: failed (missing GROQ_API_KEY)`);
    throw new Error("AI_PROVIDER_NOT_CONFIGURED: GROQ_API_KEY is missing from the environment.");
  }

  const primaryModel = preferredModel || process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const modelQueue = Array.from(new Set([primaryModel, ...FALLBACK_TEXT_MODELS]));

  // Build clean OpenAI/Groq messages array without empty or undefined content
  let rawMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const msg of contents) {
    const role: "user" | "assistant" = msg.role === "model" || msg.role === "assistant" ? "assistant" : "user";
    let text = "";
    if (typeof msg.parts?.[0]?.text === "string") {
      text = msg.parts[0].text.trim();
    } else if (typeof msg.content === "string") {
      text = msg.content.trim();
    } else if (typeof msg.text === "string") {
      text = msg.text.trim();
    }

    if (text) {
      rawMessages.push({ role, content: text });
    }
  }

  // Ensure there is at least one user message
  if (!rawMessages.some((m) => m.role === "user")) {
    rawMessages.push({ role: "user", content: "Hello SITA, please provide guidance based on my health context." });
  }

  // Calculate diagnostic token breakdown
  const sysTokens = estimateTokens(systemInstruction);
  const userQueryMsg = rawMessages.filter((m) => m.role === "user").pop()?.content || "";
  const userQueryTokens = estimateTokens(userQueryMsg);
  const conversationTokens = rawMessages.slice(0, -1).reduce((acc, m) => acc + estimateTokens(m.content), 0);

  let healthTokens = 0;
  let docOcrTokens = 0;
  if (systemInstruction.includes("=== SITA PERSONAL HEALTH MEMORY")) {
    const memChunk = systemInstruction.split("=== SITA PERSONAL HEALTH MEMORY")[1] || "";
    healthTokens = estimateTokens(memChunk);
  }
  if (systemInstruction.includes("[NEWLY ATTACHED MEDICAL DOCUMENT]")) {
    const docChunk = systemInstruction.split("[NEWLY ATTACHED MEDICAL DOCUMENT]")[1] || "";
    docOcrTokens = estimateTokens(docChunk);
  }

  // Apply conservative context budget control (Max 4,500 tokens input budget to guarantee safety against 8,000 TPM limit)
  let { compactedSystem, compactedMessages, reductionNote } = compactContextForBudget(
    systemInstruction,
    rawMessages,
    4500
  );

  const finalMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: compactedSystem.trim() },
    ...compactedMessages,
  ];

  let finalContextSize = finalMessages.reduce((acc, m) => acc + estimateTokens(m.content), 0);

  // SAFE diagnostic information strictly without PII, private records, or API keys
  console.log(`[SITA CONTEXT DEBUG]
Model: ${primaryModel}
Estimated input tokens: ${sysTokens + conversationTokens + userQueryTokens}
System prompt tokens: ${Math.max(1, sysTokens - healthTokens)}
Conversation tokens: ${conversationTokens}
Health context tokens: ${healthTokens}
Document/OCR tokens: ${docOcrTokens}
User query tokens: ${userQueryTokens}
Total estimated input tokens: ${sysTokens + conversationTokens + userQueryTokens}
Context reduction applied: ${reductionNote}
Final context size: ${finalContextSize}`);

  let lastError: any = null;

  for (const model of modelQueue) {
    try {
      const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: finalMessages,
          temperature: 0.6,
          max_tokens: 1200,
        }),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        const isRequestTooLarge = aiResponse.status === 413 || errBody.includes("rate_limit_exceeded") || errBody.includes("TPM") || errBody.includes("too large");

        console.error(`[SITA CONTEXT DEBUG]
Model ${model} returned HTTP ${aiResponse.status} (Too Large / TPM: ${isRequestTooLarge})`);

        // If context overflow occurred (HTTP 413 / TPM rate limit exceeded), perform emergency compaction and retry immediately!
        if (isRequestTooLarge) {
          console.log(`[SITA CONTEXT DEBUG] Applying emergency context reduction (minimal payload) and retrying with ${model}...`);
          const emergencyUserMsg = finalMessages.filter((m) => m.role === "user").pop()?.content || "Hello SITA";
          const profileSnippet = systemInstruction.split("\n").filter((l) => l.startsWith("Profile:") || l.startsWith("[User Context]:") || l.startsWith("User Profile:")).join("\n");
          const emergencySystem = `You are SITA, an empathetic women's health companion.${profileSnippet ? `\n${profileSnippet}` : ""}\nProvide supportive, grounded guidance citing any known profile baseline.`;
          
          const retryResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: emergencySystem },
                { role: "user", content: emergencyUserMsg },
              ],
              temperature: 0.6,
              max_tokens: 1000,
            }),
          });

          if (retryResp.ok) {
            const retryData = (await retryResp.json()) as any;
            const reply = retryData?.choices?.[0]?.message?.content?.trim();
            if (reply) {
              return reply.includes("<think>") ? reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim() : reply;
            }
          }
        }

        const err: any = new Error(`AI Provider HTTP ${aiResponse.status}: ${errBody}`);
        err.status = aiResponse.status;
        err.model = model;
        lastError = err;
        continue;
      }

      const aiData = (await aiResponse.json()) as any;
      const choicesExist = Array.isArray(aiData?.choices) && aiData.choices.length > 0;
      const firstChoice = choicesExist ? aiData.choices[0] : undefined;
      const messageExist = Boolean(firstChoice?.message);
      const rawContent = messageExist ? firstChoice.message.content : undefined;
      const contentType = typeof rawContent;
      const contentExist = contentType === "string" && rawContent.trim().length > 0;

      if (contentExist) {
        let reply = String(rawContent).trim();
        // Filter out Qwen <think> reasoning tags if present
        if (reply.includes("<think>")) {
          reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
        }
        if (reply) {
          return reply;
        }
      }
    } catch (err: any) {
      console.error(`[SITA CONTEXT DEBUG] Model ${model} execution error:`, err.message);
      lastError = err;
    }
  }

  if (lastError) {
    console.error("[SITA AI] All models in queue failed. Last error:", lastError);
    throw lastError;
  }

  return "I am here with you. Please take a gentle breath, stay hydrated, and let me know if you would like me to review your symptoms or records again.";
}

export async function extractStructuredMedicalDocument(
  imageBase64?: string,
  rawText?: string,
  documentTypeHint?: string
): Promise<{ extracted_text: string; structured_data: StructuredMedicalRecord }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED: GROQ_API_KEY is missing from the environment.");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  
  const systemPrompt = `You are SITA's Advanced Multilingual Clinical Medical Document & Prescription Extraction Engine.
Analyze the provided medical document (image or text). You must accurately identify text in English or Indian Regional/Local languages (such as Hindi, Odia, Bengali, Telugu, Tamil, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Assamese).

CRITICAL CLINICAL & MULTILINGUAL RULES:
1. LANGUAGE DETECTION:
   - Identify the primary language (e.g. "English", "Hindi", "Odia", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Malayalam", "Punjabi", "Assamese").
   - Identify the script (e.g. "Latin", "Devanagari", "Odia", "Bengali", "Tamil", "Telugu", "Gurmukhi", "Gujarati", "Kannada", "Malayalam").
   - Preserve the exact raw text in the original language in "original_text".
   - Provide a precise English medical translation/normalization in "normalized_english_text".

2. STRICT MEDICAL FIDELITY & ZERO HALLUCINATION:
   - NEVER hallucinate, invent, or extrapolate medications, dosages, or lab numbers that are not explicitly documented.
   - Extract medication names, exact dosage strengths (e.g., 500mg, 100mcg), standardized frequencies (e.g., "Once daily after meals", "Twice daily (BD)", "Three times daily (TDS)", "At bedtime"), duration, and specific instructions (e.g., "Take with lemon water", "Avoid dairy near dose").
   - Extract laboratory & diagnostic test results: test name, measured value, parsed numeric value, unit, reference range, and flag ('normal', 'low', 'high', 'abnormal', 'borderline').
   - Extract pelvic/fetal ultrasound notes, endometrial thickness, gestational age, follicles, or clinical impressions.
   - Extract doctor's name, clinical registration number if visible, and hospital/clinic name.

3. HANDWRITING & UNCERTAINTY:
   - If portions of doctor handwriting or image areas are illegible, do NOT guess.
   - Set confidence to "medium" or "low" and populate "handwriting_notes" with: "Some handwriting could not be read confidently. Please upload a clearer image or confirm with your pharmacist."

4. OUTPUT FORMAT:
   - Return strictly a valid JSON object matching the schema below. No conversational preamble, no markdown formatting.

JSON SCHEMA:
{
  "detected_language": "string (e.g. 'English', 'Hindi', 'Odia', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati')",
  "detected_script": "string (e.g. 'Latin', 'Devanagari', 'Odia', 'Bengali', 'Tamil', 'Telugu')",
  "original_text": "string (full transcribed text in original language/script)",
  "normalized_english_text": "string (clear translated medical text in English)",
  "title": "string (e.g. 'Prescription - Dr. Ananya Sharma' or 'Pelvic Ultrasound Report' or 'CBC Blood Report')",
  "document_type": "Prescription" | "Lab Report" | "Ultrasound Report" | "Doctor Note" | "Discharge Summary" | "Blood Report" | "Medical Record",
  "document_date": "YYYY-MM-DD (format if identifiable, otherwise '${todayStr}')",
  "doctor_name": "string or null",
  "hospital_name": "string or null",
  "diagnoses": ["string"],
  "symptoms": ["string"],
  "medications": [
    {
      "name": "string",
      "dosage": "string (e.g. '500mg', '100mcg', '10mg')",
      "frequency": "string (e.g. 'Once daily after breakfast', 'BD (Twice daily)', 'TDS', 'At bedtime')",
      "duration": "string (e.g. '1 month', '14 days', '3 months')",
      "instructions": "string (e.g. 'Take after food with water')"
    }
  ],
  "investigations": ["string (tests recommended or ordered)"],
  "lab_results": [
    {
      "test_name": "string (e.g. 'Hemoglobin', 'TSH', 'Fasting Blood Glucose', 'Beta-hCG', 'Ferritin')",
      "value": "string (e.g. '10.4', '1.85', '110')",
      "numeric_value": number or null,
      "unit": "string (e.g. 'g/dL', 'mIU/L', 'mg/dL')",
      "reference_range": "string (e.g. '12.0 - 15.5 g/dL')",
      "flag": "normal" | "low" | "high" | "abnormal" | "borderline" | null
    }
  ],
  "important_findings": ["string (e.g. 'Single live intrauterine pregnancy at 6w3d', 'Endometrial thickness 8.2mm', 'Polycystic ovarian appearance')"],
  "notes": "string (Doctor advice, dietary guidance, follow-up timelines)",
  "handwriting_notes": "string (Note regarding legibility or 'Clean printed text' or null)",
  "confidence": "high" | "medium" | "low"
}`;

  let parsedData: StructuredMedicalRecord | null = null;
  let ocrSummary = "";

  // 1. Try Multimodal Vision Models first if image is provided
  if (imageBase64) {
    const userPrompt = `Analyze this medical document or prescription image (which may be in English or an Indian regional language such as Hindi, Odia, Bengali, Tamil, Telugu, etc.). Detect the script/language, extract all original text, translate to English, and extract structured medical JSON matching the schema.`;

    for (const visionModel of VISION_MODELS) {
      try {
        console.log(`[SITA Multilingual Multimodal] Attempting vision extraction with ${visionModel}...`);
        const visionResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: visionModel,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  { type: "image_url", image_url: { url: imageBase64 } },
                ],
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 1800,
          }),
        });

        if (visionResp.ok) {
          const vData = (await visionResp.json()) as any;
          let rawContent = vData?.choices?.[0]?.message?.content?.trim();
          if (rawContent) {
            if (rawContent.includes("<think>")) {
              rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
            }
            const cleanJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
            parsedData = JSON.parse(cleanJson);
            ocrSummary = parsedData?.normalized_english_text || parsedData?.original_text || parsedData?.notes || `${parsedData?.title || "Medical document"} processed via SITA Multimodal Vision Engine`;
            console.log(`[SITA Multilingual Multimodal] Vision extraction succeeded with ${visionModel}. Language: ${parsedData?.detected_language || "English"}`);
            break;
          }
        } else {
          const errText = await visionResp.text();
          console.warn(`[SITA Multimodal] Vision model ${visionModel} returned ${visionResp.status}:`, errText.slice(0, 150));
        }
      } catch (vErr: any) {
        console.warn(`[SITA Multimodal] Vision exception with ${visionModel}:`, vErr.message);
      }
    }
  }

  // 2. If vision was unavailable or rawText was provided, use multilingual text-based extraction
  if (!parsedData && (rawText || imageBase64)) {
    let textToAnalyze = rawText ? String(rawText).trim() : "";

    // If no rawText provided but image was provided, attempt lightweight OCR fallback
    if (!textToAnalyze && imageBase64) {
      try {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        const ocrRes = await worker.recognize(imageBase64);
        textToAnalyze = ocrRes.data.text.trim();
        await worker.terminate();
      } catch (ocrFallbackErr) {
        console.warn("[SITA Multimodal] OCR fallback issue:", ocrFallbackErr);
      }
    }

    if (textToAnalyze && textToAnalyze.length > 5) {
      ocrSummary = textToAnalyze;
      for (const textModel of FALLBACK_TEXT_MODELS) {
        try {
          const textResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: textModel,
              messages: [
                { role: "system", content: systemPrompt },
                {
                  role: "user",
                  content: `Extract structured medical JSON with language detection from this medical document text (English or Indian regional language):\n\n${textToAnalyze}`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
              max_tokens: 1800,
            }),
          });

          if (textResp.ok) {
            const tData = (await textResp.json()) as any;
            let raw = tData?.choices?.[0]?.message?.content?.trim();
            if (raw) {
              if (raw.includes("<think>")) {
                raw = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
              }
              const cleanJson = raw.replace(/```json/g, "").replace(/```/g, "").trim();
              parsedData = JSON.parse(cleanJson);
              break;
            }
          }
        } catch (tErr: any) {
          console.warn(`[SITA Multimodal] Text extraction failed with ${textModel}:`, tErr.message);
        }
      }
    }
  }

  // 3. Fallback safe default record if all extraction failed
  if (!parsedData) {
    parsedData = {
      title: documentTypeHint ? `${documentTypeHint} Document` : "Uploaded Medical Document",
      document_type: documentTypeHint || "Medical Record",
      document_date: todayStr,
      detected_language: "English",
      detected_script: "Latin",
      original_text: ocrSummary || "",
      normalized_english_text: ocrSummary || "",
      doctor_name: null,
      hospital_name: null,
      diagnoses: [],
      symptoms: [],
      medications: [],
      investigations: [],
      lab_results: [],
      important_findings: ["Medical document uploaded and preserved in SITA Health Memory."],
      notes: ocrSummary || "Document received and securely recorded in user health memory.",
      confidence: "medium",
    };
  }

  // Normalize structure to guarantee safe arrays and types
  const normalized: StructuredMedicalRecord = {
    title: parsedData.title || "Uploaded Medical Document",
    document_type: parsedData.document_type || "Medical Record",
    document_date: parsedData.document_date || todayStr,
    detected_language: parsedData.detected_language || "English",
    detected_script: parsedData.detected_script || "Latin",
    original_text: parsedData.original_text || ocrSummary || "",
    normalized_english_text: parsedData.normalized_english_text || ocrSummary || "",
    doctor_name: parsedData.doctor_name || null,
    hospital_name: parsedData.hospital_name || null,
    diagnoses: Array.isArray(parsedData.diagnoses) ? parsedData.diagnoses : [],
    symptoms: Array.isArray(parsedData.symptoms) ? parsedData.symptoms : [],
    medications: Array.isArray(parsedData.medications)
      ? parsedData.medications.map((m: any) =>
          typeof m === "string"
            ? { name: m, dosage: "", frequency: "", duration: "", instructions: "" }
            : {
                name: m.name || "Medication",
                dosage: m.dosage || "",
                frequency: m.frequency || "",
                duration: m.duration || "",
                instructions: m.instructions || "",
                is_active: true,
              }
        )
      : [],
    investigations: Array.isArray(parsedData.investigations) ? parsedData.investigations : [],
    lab_results: Array.isArray(parsedData.lab_results)
      ? parsedData.lab_results.map((l: any) => ({
          test_name: l.test_name || "Lab Test",
          value: String(l.value || ""),
          numeric_value: typeof l.numeric_value === "number" ? l.numeric_value : null,
          unit: l.unit || "",
          reference_range: l.reference_range || "",
          flag: l.flag || null,
        }))
      : [],
    important_findings: Array.isArray(parsedData.important_findings) ? parsedData.important_findings : [],
    notes: parsedData.notes || "",
    handwriting_notes: parsedData.handwriting_notes || undefined,
    confidence: parsedData.confidence || "high",
  };

  const combinedExtractedText = [
    normalized.original_text ? `[Original Document Text - ${normalized.detected_language || "Native Script"}]:\n${normalized.original_text}` : "",
    normalized.normalized_english_text && normalized.detected_language !== "English" ? `\n[English Translation]:\n${normalized.normalized_english_text}` : "",
  ].filter(Boolean).join("\n\n") || ocrSummary || normalized.notes || "";

  return {
    extracted_text: combinedExtractedText,
    structured_data: normalized,
  };
}

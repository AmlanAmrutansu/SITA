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
  doctor_name?: string | null;
  hospital_name?: string | null;
  diagnoses: string[];
  symptoms: string[];
  medications: StructuredMedication[];
  investigations: string[];
  lab_results: StructuredLabResult[];
  important_findings: string[];
  notes?: string;
  confidence?: "high" | "medium" | "low";
}

const FALLBACK_TEXT_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "qwen/qwen3.6-27b",
];

const VISION_MODELS = [
  "qwen/qwen3.6-27b",
  "qwen/qwen3.8-27b",
];

export async function generateSitaResponse(
  systemInstruction: string,
  contents: any[],
  preferredModel?: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED: GROQ_API_KEY is missing from the environment.");
  }

  const primaryModel = preferredModel || process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const modelQueue = Array.from(new Set([primaryModel, ...FALLBACK_TEXT_MODELS]));

  const messages = [
    { role: "system", content: systemInstruction },
    ...contents.map((msg) => ({
      role: msg.role === "model" || msg.role === "assistant" ? "assistant" : "user",
      content: typeof msg.parts?.[0]?.text === "string" ? msg.parts[0].text : (typeof msg.content === "string" ? msg.content : ""),
    })),
  ];

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
          messages,
          temperature: 0.7,
          max_tokens: 1200,
        }),
      });

      if (!aiResponse.ok) {
        const errBody = await aiResponse.text();
        console.warn(`[SITA AI] Model ${model} returned HTTP ${aiResponse.status}:`, errBody.slice(0, 200));
        lastError = new Error(`AI Provider HTTP ${aiResponse.status}: ${errBody}`);
        // If it's a rate limit or 503 over capacity, try next model in queue
        continue;
      }

      const aiData = (await aiResponse.json()) as any;
      let reply = aiData?.choices?.[0]?.message?.content?.trim();
      
      // Filter out Qwen <think> reasoning tags if present
      if (reply && reply.includes("<think>")) {
        reply = reply.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      }

      if (reply) {
        return reply;
      }
    } catch (err: any) {
      console.warn(`[SITA AI] Exception with model ${model}:`, err.message);
      lastError = err;
    }
  }

  if (lastError) {
    console.error("[SITA AI] All models failed in queue. Last error:", lastError);
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
  const systemPrompt = `You are SITA's Specialized Multimodal Clinical Medical Document Extraction Engine.
Analyze the provided medical document (image or text). Extract all clinical details accurately and return strictly a valid JSON object matching the schema below.

CRITICAL CLINICAL RULES:
1. NEVER hallucinate or invent medications, lab values, or dosages not visible in the document.
2. If text is unclear or partially visible, extract what is visible with high fidelity.
3. Normalize medication schedules (e.g. "Once daily after meals", "500mg Twice daily", "100mcg Before breakfast").
4. Extract laboratory values with their test name, measured value, units, reference range, and flags (normal, high, low, abnormal).
5. Extract key clinical findings, ultrasound notes, and doctor advice.
6. Return ONLY the JSON object.

JSON SCHEMA:
{
  "title": "string (Concise title e.g. 'Prescription - Dr. Sharma' or 'Pelvic Ultrasound Report')",
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
      "frequency": "string (e.g. 'Once daily after breakfast', 'Twice daily')",
      "duration": "string (e.g. '1 month', '14 days')",
      "instructions": "string (e.g. 'Take with water after food')"
    }
  ],
  "investigations": ["string"],
  "lab_results": [
    {
      "test_name": "string",
      "value": "string",
      "numeric_value": number or null,
      "unit": "string",
      "reference_range": "string",
      "flag": "normal" | "low" | "high" | "abnormal" | "borderline" | null
    }
  ],
  "important_findings": ["string"],
  "notes": "string",
  "confidence": "high" | "medium" | "low"
}`;

  let parsedData: StructuredMedicalRecord | null = null;
  let ocrSummary = "";

  // 1. Try Multimodal Vision Models first if image is provided
  if (imageBase64) {
    const userPrompt = `Extract medical document information${documentTypeHint ? ` for type '${documentTypeHint}'` : ""}. Return strictly JSON matching the required schema.`;

    for (const visionModel of VISION_MODELS) {
      try {
        console.log(`[SITA Multimodal] Attempting vision extraction with ${visionModel}...`);
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
            max_tokens: 1500,
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
            ocrSummary = parsedData?.notes || `${parsedData?.title || 'Medical document'} analyzed via multimodal AI vision`;
            console.log(`[SITA Multimodal] Vision extraction succeeded with ${visionModel}`);
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

  // 2. If vision was unavailable or rawText was provided, use text-based extraction
  if (!parsedData && (rawText || imageBase64)) {
    let textToAnalyze = rawText ? String(rawText).trim() : "";

    // If no rawText provided but image failed vision, attempt lightweight OCR fallback
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
                  content: `Please extract structured medical JSON from this text:\n\n${textToAnalyze}`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
              max_tokens: 1500,
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

  // 3. Fallback safe default record if all failed
  if (!parsedData) {
    parsedData = {
      title: documentTypeHint ? `${documentTypeHint} Document` : "Uploaded Medical Document",
      document_type: documentTypeHint || "Medical Record",
      document_date: todayStr,
      doctor_name: null,
      hospital_name: null,
      diagnoses: [],
      symptoms: [],
      medications: [],
      investigations: [],
      lab_results: [],
      important_findings: ["Medical document image uploaded to SITA Health Memory."],
      notes: ocrSummary || "Document received and preserved in user health memory.",
      confidence: "medium",
    };
  }

  // Normalize structure to ensure valid arrays and strings
  const normalized: StructuredMedicalRecord = {
    title: parsedData.title || "Uploaded Medical Document",
    document_type: parsedData.document_type || "Medical Record",
    document_date: parsedData.document_date || todayStr,
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
    confidence: parsedData.confidence || "high",
  };

  return {
    extracted_text: ocrSummary || normalized.notes || "",
    structured_data: normalized,
  };
}


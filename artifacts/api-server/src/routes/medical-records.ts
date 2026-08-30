import { Router } from "express";
import { createWorker } from "tesseract.js";
import { generateSitaResponse } from "../lib/ai-service";

const router = Router();

router.post("/extract-medical-record", async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "No image provided" });
    }

    // 1. OCR with Tesseract
    const worker = await createWorker('eng');
    const ret = await worker.recognize(imageBase64);
    const text = ret.data.text;
    await worker.terminate();

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, code: "DOCUMENT_PROCESSING_ERROR", message: "Could not extract text from the provided image. Please ensure the image is clear and readable." });
    }

    // 2. Structure with Groq
    const prompt = `You are a medical data extraction assistant. I will provide raw OCR text from a medical document.
Extract the following information and return ONLY a valid JSON object. Do not include markdown formatting or extra text.
If information is missing, use null or an empty array. Do not hallucinate information that isn't present in the document. If something is unreadable, mark it uncertain.

JSON Schema:
{
  "title": "string (A short descriptive title for this document)",
  "document_type": "string (e.g. Prescription, Lab Report, Discharge Summary, Doctor Note)",
  "document_date": "string (YYYY-MM-DD if possible, else original format)",
  "doctor_name": "string",
  "medicines": ["string"],
  "diagnoses": ["string"],
  "tests": ["string"],
  "notes": "string"
}

Raw OCR Text:
${text}`;

    const jsonString = await generateSitaResponse(prompt, [{ role: "user", parts: [{ text: "Extract the data as JSON." }] }]);
    
    // Clean JSON string
    const cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
    const structuredData = JSON.parse(cleaned);
    
    res.json({
      success: true,
      extracted_text: text,
      structured_data: structuredData
    });
  } catch (error: any) {
    console.error("Extraction error:", error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    const isModelUnavailable = error?.message?.includes("AI_MODEL_UNAVAILABLE");

    if (isConfigError) {
      res.status(503).json({ success: false, code: "AI_PROVIDER_NOT_CONFIGURED", message: "GROQ_API_KEY is not configured." });
    } else if (isModelUnavailable) {
      res.status(503).json({ success: false, code: "AI_MODEL_UNAVAILABLE", message: "The selected AI model is currently unavailable or decommissioned. Please try again later." });
    } else {
      res.status(500).json({ success: false, code: "DOCUMENT_PROCESSING_ERROR", message: "An error occurred while analyzing the document." });
    }
  }
});

export default router;

const fs = require('fs');
const path = 'artifacts/api-server/src/routes/medical-records.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'return res.status(400).json({ success: false, error: "No image provided" });',
  'return res.status(400).json({ success: false, code: "VALIDATION_ERROR", message: "No image provided" });'
);

code = code.replace(
  'return res.status(400).json({ success: false, error: "Could not extract text from image" });',
  'return res.status(400).json({ success: false, code: "DOCUMENT_PROCESSING_ERROR", message: "Could not extract text from the provided image. Please ensure the image is clear and readable." });'
);

code = code.replace(
  'res.status(500).json({ success: false, error: error.message });',
  'const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");\n    res.status(isConfigError ? 503 : 500).json({ success: false, code: isConfigError ? "AI_PROVIDER_NOT_CONFIGURED" : "DOCUMENT_PROCESSING_ERROR", message: isConfigError ? "GROQ_API_KEY is not configured." : "An error occurred while analyzing the document." });'
);

fs.writeFileSync(path, code);
console.log("Patched medical records errors");

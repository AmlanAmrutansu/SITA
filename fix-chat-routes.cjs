const fs = require('fs');
let content = fs.readFileSync('artifacts/api-server/src/routes/chat.ts', 'utf8');

content = content.replace(
  'router.post("/screening/pcos", async (req: Request, res): Promise<void> => {',
  `router.post("/screening/pcos", async (req: Request, res): Promise<void> => {
  try {`
);

content = content.replace(
  '  res.json({ result: structuredResult, explanation });\n});',
  `  res.json({ result: structuredResult, explanation });
  } catch (error: any) {
    console.error("[PCOS Screening Error]:", error);
    res.status(500).json({ message: error.message || "Internal server error during PCOS screening." });
  }
});`
);

content = content.replace(
  'router.post("/screening/triage", async (req: Request, res): Promise<void> => {',
  `router.post("/screening/triage", async (req: Request, res): Promise<void> => {
  try {`
);

content = content.replace(
  '  res.json({ result: structuredResult, explanation });\n});',
  `  res.json({ result: structuredResult, explanation });
  } catch (error: any) {
    console.error("[Symptom Triage Error]:", error);
    res.status(500).json({ message: error.message || "Internal server error during Symptom triage." });
  }
});`
);

fs.writeFileSync('artifacts/api-server/src/routes/chat.ts', content);

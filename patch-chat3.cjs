const fs = require('fs');
const path = './artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const requestId = randomUUID\(\);\n\s*console\.error\(\`\[Chat Error - \$\{requestId\}\]:\`, error\);\n\s*res\.status\(500\)\.json\(\{[\s\S]*?\}\);/g,
  `const requestId = randomUUID();
    console.error(\`[Error - \${requestId}]:\`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    res.status(isConfigError ? 503 : 500).json({
      success: false,
      requestId,
      code: isConfigError ? "AI_PROVIDER_NOT_CONFIGURED" : "AI_PROVIDER_ERROR",
      message: isConfigError ? "GROQ_API_KEY is not configured." : "SITA could not reach the AI service right now."
    });`
);

code = code.replace(
  /const requestId = randomUUID\(\);\n\s*console\.error\(\`\[PCOS Screening Error - \$\{requestId\}\]:\`, error\);\n\s*res\.status\(500\)\.json\(\{[\s\S]*?\}\);/g,
  `const requestId = randomUUID();
    console.error(\`[Error - \${requestId}]:\`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    res.status(isConfigError ? 503 : 500).json({
      success: false,
      requestId,
      code: isConfigError ? "AI_PROVIDER_NOT_CONFIGURED" : "AI_PROVIDER_ERROR",
      message: isConfigError ? "GROQ_API_KEY is not configured." : "SITA could not reach the AI service right now."
    });`
);

code = code.replace(
  /const requestId = randomUUID\(\);\n\s*console\.error\(\`\[Symptom Triage Error - \$\{requestId\}\]:\`, error\);\n\s*res\.status\(500\)\.json\(\{[\s\S]*?\}\);/g,
  `const requestId = randomUUID();
    console.error(\`[Error - \${requestId}]:\`, error);
    const isConfigError = error?.message?.includes("AI_PROVIDER_NOT_CONFIGURED");
    res.status(isConfigError ? 503 : 500).json({
      success: false,
      requestId,
      code: isConfigError ? "AI_PROVIDER_NOT_CONFIGURED" : "AI_PROVIDER_ERROR",
      message: isConfigError ? "GROQ_API_KEY is not configured." : "SITA could not reach the AI service right now."
    });`
);

fs.writeFileSync(path, code);

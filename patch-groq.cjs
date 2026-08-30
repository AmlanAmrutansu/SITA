const fs = require('fs');
const path = './artifacts/api-server/src/lib/ai-service.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /if \(\!apiKey\) \{[\s\S]*?\}/,
  `if (!apiKey) {
    throw new Error("AI_PROVIDER_NOT_CONFIGURED: GROQ_API_KEY is missing from the environment.");
  }`
);

fs.writeFileSync(path, code);

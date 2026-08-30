const fs = require('fs');
const path = './artifacts/sita-health/src/lib/api.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /chat: \(text: string\) => request<\{ reply: string \}>\('\/chat', \{ method: 'POST', body: JSON\.stringify\(\{ text \}\) \}\),/,
  `chat: (text: string, assessmentId?: string) => request<{ reply: string }>('/chat', { method: 'POST', body: JSON.stringify({ text, assessmentId }) }),`
);

fs.writeFileSync(path, code);

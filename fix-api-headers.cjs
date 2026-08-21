const fs = require('fs');

let file = 'artifacts/sita-health/src/lib/api.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers ?? {}) };",
  "const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> ?? {}) };"
);

fs.writeFileSync(file, content);

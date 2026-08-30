const fs = require('fs');
const path = 'artifacts/api-server/src/routes/medical-records.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'If information is missing, use null or an empty array. Do not invent information.',
  'If information is missing, use null or an empty array. Do not hallucinate information that isn\'t present in the document. If something is unreadable, mark it uncertain.'
);

fs.writeFileSync(path, code);
console.log("Patched OCR instruction");

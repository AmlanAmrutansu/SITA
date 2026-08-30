const fs = require('fs');
const path = './artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /\)\.catch\(console\.error\);\n\s*res\.json\(\{ reply \}\);/g,
  `);\n    res.json({ reply });`
);

fs.writeFileSync(path, code);

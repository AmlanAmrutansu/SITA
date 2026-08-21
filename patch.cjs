const fs = require('fs');
let content = fs.readFileSync('artifacts/api-server/src/routes/index.ts', 'utf8');
content = content.replace(
  "console.log('--- FRONTEND ERROR REPORT ---');",
  "require('fs').appendFileSync('frontend-errors.log', JSON.stringify(req.body) + '\\n');\n  console.log('--- FRONTEND ERROR REPORT ---');"
);
fs.writeFileSync('artifacts/api-server/src/routes/index.ts', content);

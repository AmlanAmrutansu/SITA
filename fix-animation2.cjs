const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "<AnimatePresence mode=\"wait\">",
  "<AnimatePresence>"
);

fs.writeFileSync(path, code);

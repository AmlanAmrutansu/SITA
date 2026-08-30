const fs = require('fs');
const path = './artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /sendMessage: \(text: string\) => Promise<void>;/,
  `sendMessage: (text: string, assessmentId?: string) => Promise<void>;`
);

fs.writeFileSync(path, code);

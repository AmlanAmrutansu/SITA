const fs = require('fs');
const path = './artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const sendMessage = async \(text: string\) => \{/,
  `const sendMessage = async (text: string, assessmentId?: string) => {`
);

code = code.replace(
  /const \{ reply \} = await api\.chat\(text\);/,
  `const { reply } = await api.chat(text, assessmentId);`
);

fs.writeFileSync(path, code);

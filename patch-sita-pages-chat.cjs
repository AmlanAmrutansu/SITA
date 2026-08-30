const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /await sendMessage\(\`I just completed a PCOS awareness screening \(Assessment ID: \$\{id\}\)\. What does my result mean\?\`\);/g,
  `await sendMessage(\`I just completed a PCOS awareness screening (Assessment ID: \${id}). What does my result mean?\`, id);`
);

code = code.replace(
  /await sendMessage\(\`I conducted a symptom triage for "\$\{triageSymptom\}" \(Assessment ID: \$\{id\}\)\. What does my result mean\?\`\);/g,
  `await sendMessage(\`I conducted a symptom triage for "\${triageSymptom}" (Assessment ID: \${id}). What does my result mean?\`, id);`
);

fs.writeFileSync(path, code);

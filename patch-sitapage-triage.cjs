const fs = require('fs');
const file = 'artifacts/sita-health/src/pages/sita-pages.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /await sendMessage\(`I conducted a symptom triage for "\$\{triageSymptom\}"\. Category: \$\{result\.category\}\. Recommendation: \$\{explanation\}`\);/,
  "await sendMessage(`I conducted a symptom triage for \\\"${triageSymptom}\\\". What does my result mean?`);"
);

fs.writeFileSync(file, content);

const fs = require('fs');
const file = 'artifacts/sita-health/src/pages/sita-pages.tsx';
let content = fs.readFileSync(file, 'utf8');

// For PCOS
content = content.replace(
  /await sendMessage\(`I just completed the PCOS awareness screening\. Result: \$\{result\.riskLevel\.toUpperCase\(\)\} alignment \(Score: \$\{result\.score\}\)\. Summary: \$\{explanation\}`\);/,
  "await sendMessage('I just completed the PCOS awareness screening. What does my result mean?');"
);

// For Triage
content = content.replace(
  /await sendMessage\(`I just completed a symptom triage for \$\{symptom\}\. Result: \$\{result\.riskLevel\.toUpperCase\(\)\}\. Category: \$\{result\.category\}\. \$\{explanation\}`\);/,
  "await sendMessage(`I just completed a symptom triage for ${symptom}. What does my result mean?`);"
);

fs.writeFileSync(file, content);

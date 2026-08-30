const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

// For PCOS
code = code.replace(
  /const \{ result, explanation \} = await runPCOSScreening\(/g,
  'const { result, explanation, id } = await runPCOSScreening('
);

code = code.replace(
  /await sendMessage\('I just completed the PCOS awareness screening\. What does my result mean\?'\);/g,
  'await sendMessage(`I just completed a PCOS awareness screening (Assessment ID: ${id}). What does my result mean?`);'
);

// For Triage
code = code.replace(
  /const \{ result, explanation \} = await runSymptomTriage\(/g,
  'const { result, explanation, id } = await runSymptomTriage('
);

code = code.replace(
  /await sendMessage\(`I conducted a symptom triage for \\"\$\{triageSymptom\}\\\"\. What does my result mean\?`\);/g,
  'await sendMessage(`I conducted a symptom triage for "${triageSymptom}" (Assessment ID: ${id}). What does my result mean?`);'
);

fs.writeFileSync(path, code);

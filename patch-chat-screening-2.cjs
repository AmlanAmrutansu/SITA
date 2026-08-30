const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

const pcosRegex = /const prompt = `As SITA, explain the following[\s\S]*?const explanation = await generateSitaResponse[^\]]*\]\);/g;
code = code.replace(pcosRegex, 'const explanation = "Your assessment has been saved. SITA is ready to discuss the results.";');

const triageRegex = /const prompt = `As SITA, review the following[\s\S]*?const explanation = await generateSitaResponse[^\]]*\]\);/g;
code = code.replace(triageRegex, 'const explanation = "Your symptom triage has been saved. SITA is ready to discuss the results.";');

code = code.replace(/summary_explanation: explanation/g, 'summary_explanation: "Assessment completed"');

fs.writeFileSync(path, code);

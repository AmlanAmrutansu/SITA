const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

// Just remove all generateSitaResponse calls EXCEPT the main chat one
const lines = code.split('\n');
const newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('const prompt = `As SITA, explain the following structured PCOS')) {
    skip = true;
    newLines.push('const explanation = "Your assessment has been saved. SITA is ready to discuss the results.";');
    continue;
  }
  if (line.includes('const prompt = `As SITA, review the following triage')) {
    skip = true;
    newLines.push('const explanation = "Your symptom triage has been saved. SITA is ready to discuss the results.";');
    continue;
  }
  
  if (skip) {
    if (line.includes(']);')) {
      skip = false;
    }
    continue;
  }
  
  newLines.push(line.replace('summary_explanation: explanation', 'summary_explanation: "Assessment completed"'));
}

fs.writeFileSync(path, newLines.join('\n'));

const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

const addSpecificScreening = `
    if (specificScreening) {
      userContext += \`\\n\\n[ACTIVE ASSESSMENT SUBMISSION]:\\nThe user has just completed a specific assessment and is asking about it. Use this detailed data for your response:\\n- Assessment ID: \${specificScreening.id}\\n- Type: \${specificScreening.screening_type}\\n- Risk Level: \${specificScreening.risk_level}\\n- AI Summary generated at time of assessment: \${specificScreening.summary_explanation}\\n- Raw Data: \${JSON.stringify(specificScreening.structured_result)}\\n\`;
    }
`;

// Insert it right before "const systemInstruction = "
code = code.replace(
  'const systemInstruction = `You are SITA (Smart Intelligence for Treatment & Awareness)',
  addSpecificScreening + '\n    const systemInstruction = `You are SITA (Smart Intelligence for Treatment & Awareness)'
);

fs.writeFileSync(path, code);
console.log("Patched specific screening to chat context.");

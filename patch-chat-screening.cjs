const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace PCOS logic
code = code.replace(
  /const structuredResult = evaluatePCOS\(input\);\s*const prompt = \`As SITA[\s\S]*?const explanation = await generateSitaResponse\([^\]]*\]\);\s*\/\/ Persist screening result to Supabase/,
  `const structuredResult = evaluatePCOS(input);
    const explanation = "Your assessment has been saved. SITA is ready to discuss the results.";
    
    // Persist screening result to Supabase`
);
code = code.replace(
  /summary_explanation: explanation,/,
  `summary_explanation: "Assessment completed",`
);

// Replace Triage logic
code = code.replace(
  /const structuredResult = evaluateSymptomTriage\(input\);\s*const prompt = \`As SITA[\s\S]*?const explanation = await generateSitaResponse\([^\]]*\]\);\s*\/\/ Persist triage session/,
  `const structuredResult = evaluateSymptomTriage(input);
    const explanation = "Your symptom triage has been saved. SITA is ready to discuss the results.";
    
    // Persist triage session`
);

fs.writeFileSync(path, code);

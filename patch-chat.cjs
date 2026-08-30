const fs = require('fs');
const path = './artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

// 1. Fetch symptom_logs and specific assessment
code = code.replace(
  /const text = String\(req\.body\?\.text \?\? ""\)\.trim\(\);/g,
  `const text = String(req.body?.text ?? "").trim();\n  const assessmentId = req.body?.assessmentId;`
);

// We need to inject the fetch for symptom_logs and assessmentId
code = code.replace(
  /const \[profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes, screeningRes\] = await Promise\.all\(\[/g,
  `const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes, screeningRes, symptomRes, specificScreeningRes] = await Promise.all([`
);

code = code.replace(
  /supabaseRequest\("\/rest\/v1\/screening_sessions\?select=\*\&order=created_at\.desc\&limit=2", \{ method: "GET" \}, token\),/g,
  `supabaseRequest("/rest/v1/screening_sessions?select=*&order=created_at.desc&limit=2", { method: "GET" }, token),
      supabaseRequest("/rest/v1/symptom_logs?select=symptom,category,severity,logged_at&order=logged_at.desc&limit=5", { method: "GET" }, token),
      assessmentId ? supabaseRequest(\`/rest/v1/screening_sessions?id=eq.\${encodeURIComponent(assessmentId)}&select=*\`, { method: "GET" }, token) : Promise.resolve(null),`
);

code = code.replace(
  /const profile = profileRes\.ok \? \(await responseJson\(profileRes\)\)\[0\] : null;/g,
  `const profile = profileRes.ok ? (await responseJson(profileRes))[0] : null;
    const recentSymptoms = symptomRes?.ok ? await responseJson(symptomRes) : [];
    const specificScreening = specificScreeningRes?.ok ? (await responseJson(specificScreeningRes))[0] : null;`
);

// Inject symptoms to userContext
code = code.replace(
  /if \(recentMoods\.length > 0\) \{/g,
  `if (recentSymptoms.length > 0) {
      userContext += \`\\n- Recent symptoms logged:\\n\`;
      recentSymptoms.forEach((s: any) => {
        userContext += \`  * \${s.symptom} (Category: \${s.category || 'General'}, Severity: \${s.severity || 'Unspecified'}, Date: \${s.logged_at})\\n\`;
      });
    }
    if (recentMoods.length > 0) {`
);

// Override screenings if specificScreening is provided
code = code.replace(
  /if \(recentScreenings\.length > 0\) \{/g,
  `if (specificScreening) {
      userContext += \`\\n- User is specifically asking about this recent assessment:\\n\`;
      userContext += \`  * \${specificScreening.screening_type} (ID: \${specificScreening.id}, Date: \${specificScreening.created_at}): Risk Level: \${specificScreening.risk_level}. Summary: \${specificScreening.summary_explanation || ""}\\n\`;
    } else if (recentScreenings.length > 0) {`
);

fs.writeFileSync(path, code);

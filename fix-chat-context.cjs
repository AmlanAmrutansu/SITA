const fs = require('fs');
let content = fs.readFileSync('artifacts/api-server/src/routes/chat.ts', 'utf8');

// Replace the Promise.all array to include screening_sessions
content = content.replace(
  'supabaseRequest("/rest/v1/postpartum_data?select=*&limit=1", { method: "GET" }, token),',
  `supabaseRequest("/rest/v1/postpartum_data?select=*&limit=1", { method: "GET" }, token),
    supabaseRequest("/rest/v1/screening_sessions?select=*&order=created_at.desc&limit=2", { method: "GET" }, token),`
);

// Destructure the result
content = content.replace(
  'const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes] = await Promise.all([',
  `const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes, screeningRes] = await Promise.all([`
);

// Process the result
content = content.replace(
  'const postData = postRes.ok ? (await responseJson(postRes))?.[0] : null;',
  `const postData = postRes.ok ? (await responseJson(postRes))?.[0] : null;
  const recentScreenings = (screeningRes && screeningRes.ok) ? await responseJson(screeningRes) : [];`
);

// Append to user context
content = content.replace(
  '  if (profile?.health_notes) {',
  `  if (recentScreenings && recentScreenings.length > 0) {
    userContext += \`\\n- Recent health assessments:\\n\`;
    recentScreenings.forEach((s: any) => {
      userContext += \`  * \${s.screening_type} (\${s.created_at}): Risk Level: \${s.risk_level}. Summary: \${s.summary_explanation.slice(0,100)}...\\n\`;
    });
  }

  if (profile?.health_notes) {`
);

fs.writeFileSync('artifacts/api-server/src/routes/chat.ts', content);

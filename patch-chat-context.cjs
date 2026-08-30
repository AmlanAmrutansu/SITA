const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

// Modify the unified chat endpoint to query medical records and include in context
code = code.replace(
  "    const userContext = JSON.stringify({",
  `    const recordsRes = await supabaseRequest(
      "/rest/v1/medical_records?select=*&order=document_date.desc&limit=5",
      { method: "GET" },
      token
    );
    const recentRecords = recordsRes.ok ? await responseJson(recordsRes) : [];

    const userContext = JSON.stringify({
      medical_records: recentRecords.map((r: any) => ({ title: r.title, type: r.document_type, date: r.document_date, details: r.structured_data })),`
);

fs.writeFileSync(path, code);

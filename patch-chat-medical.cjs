const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

// Add the medical_records request to the Promise.all
code = code.replace(
  'assessmentId ? supabaseRequest(`/rest/v1/screening_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=*`, { method: "GET" }, token) : Promise.resolve(null),',
  'assessmentId ? supabaseRequest(`/rest/v1/screening_sessions?id=eq.${encodeURIComponent(assessmentId)}&select=*`, { method: "GET" }, token) : Promise.resolve(null),\n      supabaseRequest("/rest/v1/medical_records?select=title,document_type,document_date,structured_data&order=document_date.desc&limit=5", { method: "GET" }, token),'
);

// Destructure the new response
code = code.replace(
  'const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes, screeningRes, symptomRes, specificScreeningRes] = await Promise.all([',
  'const [profileRes, recentMoodsRes, recentCyclesRes, pregRes, postRes, screeningRes, symptomRes, specificScreeningRes, medicalRecordsRes] = await Promise.all(['
);

// Extract JSON
code = code.replace(
  'const recentSymptoms = (symptomRes && symptomRes.ok) ? await responseJson(symptomRes) : [];',
  'const recentSymptoms = (symptomRes && symptomRes.ok) ? await responseJson(symptomRes) : [];\n    const medicalRecords = (medicalRecordsRes && medicalRecordsRes.ok) ? await responseJson(medicalRecordsRes) : [];'
);

// Add to user context string
const contextRegex = /if \(recentMoods\.length > 0\) \{\s*userContext \+= `\\n- Recent mood trends:\\n`;\s*recentMoods\.forEach\(\(m: any\) => \{\s*userContext \+= `  \* \$\{m\.logged_at\}: \$\{m\.mood\} \(Energy: \$\{m\.energy\}, Stress: \$\{m\.stress\}\)\\n`;\s*\}\);\s*\}/;

const addContext = `
    if (medicalRecords.length > 0) {
      userContext += \`\\n- Recent Medical Records / Documents:\\n\`;
      medicalRecords.forEach((r: any) => {
        userContext += \`  * Title: \${r.title} (\${r.document_type}, Date: \${r.document_date})\\n\`;
        if (r.structured_data) {
          if (r.structured_data.medicines && r.structured_data.medicines.length > 0) {
            userContext += \`    - Medicines: \${r.structured_data.medicines.join(', ')}\\n\`;
          }
          if (r.structured_data.doctor_name) {
            userContext += \`    - Doctor: \${r.structured_data.doctor_name}\\n\`;
          }
          if (r.structured_data.notes) {
            userContext += \`    - Notes: \${r.structured_data.notes}\\n\`;
          }
        }
      });
    }
`;

code = code.replace(contextRegex, match => match + addContext);

fs.writeFileSync(path, code);
console.log("Patched chat.ts for medical_records");

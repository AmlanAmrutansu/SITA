const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

const addContext = `
    if (medicalRecords && medicalRecords.length > 0) {
      userContext += \`\\n- Recent Medical Records / Documents:\\n\`;
      medicalRecords.forEach((r) => {
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

// Insert it right after the profile.health_notes section
code = code.replace(
  '    if (profile?.health_notes) {\n      userContext += `\\n- User health notes: ${profile.health_notes}`;\n    }',
  '    if (profile?.health_notes) {\n      userContext += `\\n- User health notes: ${profile.health_notes}`;\n    }\n' + addContext
);

fs.writeFileSync(path, code);
console.log("Patched medical_records to chat context.");

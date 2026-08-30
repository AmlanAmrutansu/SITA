const fs = require('fs');
const path = 'artifacts/api-server/src/routes/sita-data.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '"chat_messages",',
  '"chat_messages",\n  "medical_records",'
);

code = code.replace(
  'for (const table of ["chat_messages"',
  'for (const table of ["medical_records", "chat_messages"'
);

fs.writeFileSync(path, code);

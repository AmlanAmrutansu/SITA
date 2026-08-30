const fs = require('fs');
const path = 'artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'supabaseRequest("/rest/v1/pregnancy_data?select=*&limit=1", { method: "GET" }, token),',
  'supabaseRequest("/rest/v1/pregnancy_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),'
);

code = code.replace(
  'supabaseRequest("/rest/v1/postpartum_data?select=*&limit=1", { method: "GET" }, token),',
  'supabaseRequest("/rest/v1/postpartum_data?select=*&order=id.desc&limit=1", { method: "GET" }, token),'
);

fs.writeFileSync(path, code);
console.log("Patched order for pregnancy and postpartum");

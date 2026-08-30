const fs = require('fs');
const path = 'artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace("api.delete('medical_records', id)", "api.remove('medical_records', id)");

fs.writeFileSync(path, code);

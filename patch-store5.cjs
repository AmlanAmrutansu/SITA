const fs = require('fs');
const path = 'artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "      postpartumData,\n      medicalRecords,",
  "      postpartumData,"
);

fs.writeFileSync(path, code);

const fs = require('fs');
const path = 'artifacts/api-server/src/routes/index.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('medicalRecordsRouter')) {
  code = code.replace(
    'import chatRouter from "./chat";',
    'import chatRouter from "./chat";\nimport medicalRecordsRouter from "./medical-records";'
  );
  code = code.replace(
    'router.use(chatRouter);',
    'router.use(chatRouter);\nrouter.use(medicalRecordsRouter);'
  );
  fs.writeFileSync(path, code);
}

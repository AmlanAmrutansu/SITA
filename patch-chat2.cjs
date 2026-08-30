const fs = require('fs');
const path = './artifacts/api-server/src/routes/chat.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const pregData = pregRes\.ok \? \(await responseJson\(pregRes\)\)\?\.\[0\] : null;/g,
  `const pregData = pregRes.ok ? (await responseJson(pregRes))?.[0] : null;
    const recentSymptoms = (symptomRes && symptomRes.ok) ? await responseJson(symptomRes) : [];
    const specificScreening = (specificScreeningRes && specificScreeningRes.ok) ? (await responseJson(specificScreeningRes))?.[0] : null;`
);

fs.writeFileSync(path, code);

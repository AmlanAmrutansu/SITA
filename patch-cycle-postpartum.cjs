const fs = require('fs');
const file = 'artifacts/sita-health/src/lib/cycle.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/let totalDays = 42; \/\/ default 6 weeks if unrecorded/, 'let totalDays = 0; // default 0 if unrecorded');

fs.writeFileSync(file, content);

const fs = require('fs');
const file = 'artifacts/sita-health/src/lib/cycle.ts';
let content = fs.readFileSync(file, 'utf8');

// Patch calculatePregnancyStats
content = content.replace(/\/\/ Default 20 weeks 3 days if unrecorded\s+totalDays = 20 \* 7 \+ 3;/, '// Default to 0\ntotalDays = 0;');

// Patch calculatePostpartumStats
// Let's find calculatePostpartumStats
fs.writeFileSync(file, content);

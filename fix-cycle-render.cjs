const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');

// Replace the buggy calculations
content = content.replace(
  'const isPredicted = cycle.hasPeriodData && day >= cycle.currentDay + cycle.nextPeriodIn - 1 && day <= cycle.currentDay + cycle.nextPeriodIn + 2;',
  'const isPredicted = cycle.hasPeriodData && cycle.predictedPeriodDates.includes(dStr);'
);
content = content.replace(
  'const isFertile = cycle.hasPeriodData && day >= cycle.fertileWindowStart && day <= cycle.fertileWindowEnd;',
  'const isFertile = cycle.hasPeriodData && cycle.fertileWindowDates.includes(dStr);'
);
content = content.replace(
  'const isOvulation = cycle.hasPeriodData && day === cycle.ovulationDay;',
  'const isOvulation = cycle.hasPeriodData && cycle.ovulationDateStr === dStr;'
);

fs.writeFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', content);

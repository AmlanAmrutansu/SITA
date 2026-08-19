const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/data/store.tsx', 'utf8');

content = content.replace(
  '      if (cyclesData && cyclesData.length > 0) {\n        setCycleLogs(cyclesData);\n        setPeriodDateStrings(cyclesData.map((c: any) => c.period_date));\n      }',
  `      const pDates = new Set<string>();
      if (cyclesData && cyclesData.length > 0) {
        setCycleLogs(cyclesData);
        cyclesData.forEach((c: any) => pDates.add(c.period_date));
      }
      if (profileData?.last_period_date) {
        pDates.add(profileData.last_period_date);
      }
      if (pDates.size > 0) {
        setPeriodDateStrings(Array.from(pDates));
      }`
);

fs.writeFileSync('artifacts/sita-health/src/data/store.tsx', content);

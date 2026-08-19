const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/lib/cycle.ts', 'utf8');

// Modify CycleSummary interface
content = content.replace(
  "  isTodayPeriod: boolean;\n}",
  `  isTodayPeriod: boolean;
  predictedPeriodDates: string[];
  fertileWindowDates: string[];
  ovulationDateStr: string | null;
}`
);

// Update calculateCycleSummary
content = content.replace(
  "  const isTodayPeriod = sortedDates.includes(todayStr);\n\n  return {\n    hasPeriodData,",
  `  const predictedPeriodDates: string[] = [];
  const fertileWindowDates: string[] = [];
  let ovulationDateStr: string | null = null;

  if (hasPeriodData && lastPeriodStart) {
    // Ovulation is ~14 days before next period
    const expectedNextPeriodStart = new Date(lastPeriodStart);
    expectedNextPeriodStart.setDate(lastPeriodStart.getDate() + cycleLength);
    
    // Fill predicted period dates (next 5 days)
    for(let i = 0; i < periodLength; i++) {
       const d = new Date(expectedNextPeriodStart);
       d.setDate(expectedNextPeriodStart.getDate() + i);
       predictedPeriodDates.push(formatDate(d));
    }
    
    // Fill fertile window
    const expectedOvulation = new Date(expectedNextPeriodStart);
    expectedOvulation.setDate(expectedNextPeriodStart.getDate() - 14);
    ovulationDateStr = formatDate(expectedOvulation);
    
    for(let i = -5; i <= 1; i++) {
       const d = new Date(expectedOvulation);
       d.setDate(expectedOvulation.getDate() + i);
       fertileWindowDates.push(formatDate(d));
    }
  }

  const isTodayPeriod = sortedDates.includes(todayStr);

  return {
    hasPeriodData,
    predictedPeriodDates,
    fertileWindowDates,
    ovulationDateStr,`
);

fs.writeFileSync('artifacts/sita-health/src/lib/cycle.ts', content);

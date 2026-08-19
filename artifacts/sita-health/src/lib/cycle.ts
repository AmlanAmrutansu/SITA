export interface CycleSummary {
  currentDay: number;
  averageCycleLength: number;
  periodLength: number;
  nextPeriodIn: number;
  phase: 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';
}

export function calculateCycleSummary(periodDays: number[], averageCycleLength = 28, today = 14): CycleSummary {
  const logged = [...new Set(periodDays)].sort((a, b) => a - b);
  const firstDay = logged[0] ?? today;
  const periodLength = logged.length > 0 ? Math.max(1, logged.length) : 0;
  const currentDay = Math.max(1, today - firstDay + 1);
  const nextPeriodIn = Math.max(0, averageCycleLength - currentDay);
  const phase = currentDay <= periodLength ? 'Menstrual' : currentDay <= 13 ? 'Follicular' : currentDay <= 16 ? 'Ovulatory' : 'Luteal';
  return { currentDay, averageCycleLength, periodLength, nextPeriodIn, phase };
}
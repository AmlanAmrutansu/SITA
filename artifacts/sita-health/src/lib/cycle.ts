export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulatory' | 'Luteal';

export interface CycleSummary {
  hasPeriodData: boolean;
  currentDay: number;
  averageCycleLength: number;
  periodLength: number;
  nextPeriodIn: number;
  nextPeriodDateStr: string;
  phase: CyclePhase;
  phaseTitle: string;
  phaseDescription: string;
  fertileWindowStart: number;
  fertileWindowEnd: number;
  ovulationDay: number;
  isTodayPeriod: boolean;
  predictedPeriodDates: string[];
  fertileWindowDates: string[];
  ovulationDateStr: string | null;
}

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateCycleSummary(
  periodDateStrings: string[],
  typicalCycleLength = 28,
  typicalPeriodLength = 5,
  referenceDate: Date = new Date(),
): CycleSummary {
  const sortedDates = [...periodDateStrings]
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  let lastPeriodStart: Date | null = null;
  let periodLength = typicalPeriodLength;
  const cycleLength = Math.max(20, Math.min(60, typicalCycleLength));
  const hasPeriodData = sortedDates.length > 0;

  if (hasPeriodData) {
    // Find the most recent continuous cluster of period dates
    const clusters: Date[][] = [];
    let currentCluster: Date[] = [parseDate(sortedDates[0])];

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = parseDate(sortedDates[i - 1]);
      const curr = parseDate(sortedDates[i]);
      const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 3) {
        currentCluster.push(curr);
      } else {
        clusters.push(currentCluster);
        currentCluster = [curr];
      }
    }
    clusters.push(currentCluster);

    const latestCluster = clusters[clusters.length - 1];
    lastPeriodStart = latestCluster[0];
    periodLength = Math.max(1, latestCluster.length);
  }

  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());

  let currentDay = 1;
  if (lastPeriodStart) {
    const diffMs = today.getTime() - lastPeriodStart.getTime();
    const rawDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    currentDay = rawDays >= 0 ? (rawDays % cycleLength) + 1 : 1;
  }

  const nextPeriodIn = hasPeriodData ? Math.max(0, cycleLength - currentDay + 1) : cycleLength;
  const nextPeriodDate = new Date(today);
  nextPeriodDate.setDate(today.getDate() + nextPeriodIn);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nextPeriodDateStr = hasPeriodData ? `${nextPeriodDate.getDate()} ${monthNames[nextPeriodDate.getMonth()]}` : 'Log to predict';

  let phase: CyclePhase = 'Follicular';
  let phaseTitle = hasPeriodData ? 'Follicular Phase' : 'Cycle Tracking Ready';
  let phaseDescription = hasPeriodData
    ? 'Estrogen rises, energy builds, and follicles mature.'
    : 'Log your period start date to calculate personalized cycle phases and fertile windows.';

  const ovulationDay = Math.round(cycleLength - 14);
  const fertileWindowStart = Math.max(1, ovulationDay - 5);
  const fertileWindowEnd = Math.min(cycleLength, ovulationDay + 1);

  if (hasPeriodData) {
    if (currentDay <= periodLength) {
      phase = 'Menstrual';
      phaseTitle = 'Menstrual Phase';
      phaseDescription = 'Uterine lining sheds. Prioritize warmth, iron-rich foods, and gentle rest.';
    } else if (currentDay < fertileWindowStart) {
      phase = 'Follicular';
      phaseTitle = 'Follicular Phase';
      phaseDescription = 'Estrogen rises, renewal begins, and mental clarity usually increases.';
    } else if (currentDay <= fertileWindowEnd) {
      phase = 'Ovulatory';
      phaseTitle = 'Ovulatory Phase';
      phaseDescription = 'Luteinizing hormone peaks and egg is released. Peak fertility window.';
    } else {
      phase = 'Luteal';
      phaseTitle = 'Luteal Phase';
      phaseDescription = 'Progesterone dominates. Body temperature rises; mood and cravings may fluctuate.';
    }
  }

  const todayStr = formatDate(today);
  const predictedPeriodDates: string[] = [];
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
    ovulationDateStr,
    currentDay,
    averageCycleLength: cycleLength,
    periodLength,
    nextPeriodIn,
    nextPeriodDateStr,
    phase,
    phaseTitle,
    phaseDescription,
    fertileWindowStart,
    fertileWindowEnd,
    ovulationDay,
    isTodayPeriod,
  };
}

// Pregnancy week calculation based on LMP or Due Date
export function calculatePregnancyStats(dueDateStr?: string | null, lmpDateStr?: string | null) {
  const today = new Date();
  let totalDays = 0;

  if (dueDateStr) {
    const due = parseDate(dueDateStr);
    const msUntilDue = due.getTime() - today.getTime();
    const daysUntilDue = Math.round(msUntilDue / (1000 * 60 * 60 * 24));
    totalDays = Math.max(0, Math.min(280, 280 - daysUntilDue));
  } else if (lmpDateStr) {
    const lmp = parseDate(lmpDateStr);
    const msSinceLmp = today.getTime() - lmp.getTime();
    totalDays = Math.max(0, Math.min(280, Math.round(msSinceLmp / (1000 * 60 * 60 * 24))));
  } else {
    // Default 20 weeks 3 days if unrecorded
    totalDays = 20 * 7 + 3;
  }

  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  const trimester = weeks <= 13 ? '1st Trimester' : weeks <= 27 ? '2nd Trimester' : '3rd Trimester';

  const babySizes: Record<number, { item: string; emoji: string; weight: string; length: string }> = {
    8: { item: 'Raspberry', emoji: '🫐', weight: '1 g', length: '1.6 cm' },
    12: { item: 'Lime', emoji: '🍋', weight: '14 g', length: '5.4 cm' },
    16: { item: 'Avocado', emoji: '🥑', weight: '100 g', length: '11.6 cm' },
    20: { item: 'Banana', emoji: '🍌', weight: '300 g', length: '25.6 cm' },
    24: { item: 'Corn Cob', emoji: '🌽', weight: '600 g', length: '30 cm' },
    28: { item: 'Eggplant', emoji: '🍆', weight: '1 kg', length: '37 cm' },
    32: { item: 'Pineapple', emoji: '🍍', weight: '1.7 kg', length: '42 cm' },
    36: { item: 'Honeydew Melon', emoji: '🍈', weight: '2.6 kg', length: '47 cm' },
    40: { item: 'Watermelon', emoji: '🍉', weight: '3.4 kg', length: '51 cm' },
  };

  const milestoneKeys = [8, 12, 16, 20, 24, 28, 32, 36, 40];
  const closestWeek = milestoneKeys.reduce((prev, curr) => (Math.abs(curr - weeks) < Math.abs(prev - weeks) ? curr : prev), 20);
  const baby = babySizes[closestWeek] || { item: 'Banana', emoji: '🍌', weight: '300 g', length: '25.6 cm' };

  return {
    weeks: Math.max(1, weeks),
    days,
    trimester,
    babySizeItem: baby.item,
    babySizeEmoji: baby.emoji,
    babyWeight: baby.weight,
    babyLength: baby.length,
    daysRemaining: Math.max(0, 280 - totalDays),
    progressPercent: Math.round((totalDays / 280) * 100),
  };
}

// Postpartum calculation
export function calculatePostpartumStats(birthDateStr?: string | null) {
  const today = new Date();
  let totalDays = 42; // default 6 weeks if unrecorded

  if (birthDateStr) {
    const birth = parseDate(birthDateStr);
    const msSinceBirth = today.getTime() - birth.getTime();
    totalDays = Math.max(0, Math.round(msSinceBirth / (1000 * 60 * 60 * 24)));
  }

  const weeks = Math.max(1, Math.floor(totalDays / 7));
  const days = totalDays % 7;

  let stage = 'Early Recovery (Fourth Trimester)';
  let advice = 'Rest as much as possible, let others assist, and stay nourished with warm hydration.';

  if (weeks <= 2) {
    stage = 'Acute Postpartum Recovery';
    advice = 'Focus on gentle bonding, resting flat when possible, and staying hydrated.';
  } else if (weeks <= 6) {
    stage = 'Subacute Tissue Healing';
    advice = 'Gentle pelvic floor awareness, nourishing soups, and taking each day at your own pace.';
  } else {
    stage = 'Ongoing Maturation & Wellness';
    advice = 'Gradual reintegration of daily activities, honoring changes in strength and stamina.';
  }

  return {
    weeks,
    days,
    stage,
    advice,
  };
}

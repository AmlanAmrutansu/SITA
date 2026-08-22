import { CycleLogItem, SymptomLogItem, MoodEntry, Profile } from '../data/store';
import { parseDate } from './cycle';

export type PatternSeverity = 'green' | 'yellow' | 'orange' | 'red';

export interface PatternAlert {
  severity: PatternSeverity;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}

export function getCycleLengths(periodDateStrings: string[]): number[] {
  if (periodDateStrings.length < 2) return [];
  const sortedDates = [...periodDateStrings]
    .filter(Boolean)
    .sort((a, b) => parseDate(a).getTime() - parseDate(b).getTime());

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

  const cycleLengths: number[] = [];
  for (let i = 1; i < clusters.length; i++) {
    const prevStart = clusters[i - 1][0];
    const currStart = clusters[i][0];
    const diffDays = Math.round((currStart.getTime() - prevStart.getTime()) / (1000 * 60 * 60 * 24));
    cycleLengths.push(diffDays);
  }
  
  return cycleLengths;
}

export function analyzeHealthPatterns(
  periodDateStrings: string[],
  symptomLogs: SymptomLogItem[],
  moodEntries: MoodEntry[],
  typicalCycleLength: number = 28
): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  
  // 1. Analyze Red Flags (Urgent)
  const now = new Date();
  const recentSymptoms = symptomLogs.filter(s => {
    const logDate = parseDate(s.logged_at);
    const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  });
  
  const hasSeverePain = recentSymptoms.some(s => s.severity === 'severe' && s.symptom.toLowerCase().includes('pain'));
  const hasFever = recentSymptoms.some(s => s.symptom.toLowerCase().includes('fever'));
  const hasHeavyBleeding = recentSymptoms.some(s => s.symptom.toLowerCase().includes('heavy bleeding') || s.symptom.toLowerCase().includes('hemorrhage'));
  
  if (hasSeverePain && hasFever) {
    alerts.push({
      severity: 'red',
      title: 'Potentially Urgent Symptom Combination',
      description: 'SITA noticed a recent combination of severe pain and fever. Please consider seeking appropriate immediate medical attention.',
      actionLabel: 'Open Symptom Triage',
      actionUrl: '/sita?triage=true' // Route or trigger for Symptom Triage
    });
  } else if (hasHeavyBleeding && hasSeverePain) {
     alerts.push({
      severity: 'red',
      title: 'Potentially Urgent Symptom Combination',
      description: 'SITA noticed severe pain alongside heavy bleeding. Please consider seeking appropriate immediate medical attention.',
      actionLabel: 'Open Symptom Triage',
      actionUrl: '/sita?triage=true'
    });
  }

  // 2. Analyze Cycle Patterns (Yellow/Orange)
  const cycleLengths = getCycleLengths(periodDateStrings);
  if (cycleLengths.length >= 3) {
    const lastThree = cycleLengths.slice(-3);
    const avgBefore = cycleLengths.length > 3 
      ? cycleLengths.slice(0, -3).reduce((a,b)=>a+b, 0) / (cycleLengths.length - 3)
      : typicalCycleLength;
    const baseline = avgBefore;
    
    // Check for PCOS pattern (persistent irregularity or very long cycles)
    // Irregular: variability > 7-9 days consistently, or all long > 35
    const isPersistentlyLong = lastThree.every(len => len > 35);
    const isHighlyIrregular = Math.max(...lastThree) - Math.min(...lastThree) > 10;

    if (isPersistentlyLong || isHighlyIrregular) {
       alerts.push({
         severity: 'orange',
         title: 'Persistent cycle pattern changed',
         description: `Your recent cycle lengths were ${lastThree.join(', ')} days, compared with your previous average of ${Math.round(baseline)} days. SITA noticed this because the change has persisted across multiple cycles. Your recent pattern contains several indicators that can be associated with PCOS. This is not a diagnosis. Consider completing the PCOS screening or discussing these changes with a healthcare professional.`,
         actionLabel: 'Take PCOS Screening',
         actionUrl: '/sita?pcos=true'
       });
    } else if (lastThree[2] > baseline + 7) {
       alerts.push({
         severity: 'yellow',
         title: 'Pattern noticed',
         description: `Your most recent cycle was ${lastThree[2]} days, which is notably longer than your usual pattern of ${Math.round(baseline)} days.`,
         actionLabel: 'Ask SITA',
         actionUrl: '/sita'
       });
    }
  }
  
  // 3. Analyze Symptom Patterns (Yellow)
  if (symptomLogs.length >= 5) {
     // Check if a specific symptom is increasing in frequency
     // (Simple rule: a moderate/severe symptom logged > 3 times recently)
     const lastMonth = new Date();
     lastMonth.setDate(lastMonth.getDate() - 30);
     const recentModSev = symptomLogs.filter(s => parseDate(s.logged_at) >= lastMonth && (s.severity === 'moderate' || s.severity === 'severe'));
     
     const symptomCounts = recentModSev.reduce((acc, s) => {
       acc[s.symptom.toLowerCase()] = (acc[s.symptom.toLowerCase()] || 0) + 1;
       return acc;
     }, {} as Record<string, number>);
     
     const persistentSymptom = Object.entries(symptomCounts).find(([_, count]) => count >= 3);
     if (persistentSymptom && alerts.length === 0) {
        alerts.push({
          severity: 'yellow',
          title: 'Health pattern changed',
          description: `Some symptoms you've logged, such as '${persistentSymptom[0]}', have become more frequent over the last few cycles. SITA noticed this trend in your recent logs.`,
          actionLabel: 'Ask SITA',
          actionUrl: '/sita'
        });
     }
  }
  
  if (alerts.length === 0) {
    alerts.push({
      severity: 'green',
      title: 'Your health pattern looks consistent.',
      description: cycleLengths.length < 2 ? 'Not enough history yet to identify a reliable personal pattern.' : 'No significant deviations detected based on your historical baseline.',
      actionLabel: 'View Health Timeline',
      actionUrl: '/timeline'
    });
  }
  
  const order: Record<PatternSeverity, number> = { red: 4, orange: 3, yellow: 2, green: 1 };
  alerts.sort((a, b) => order[b.severity] - order[a.severity]);
  
  return [alerts[0]];
}

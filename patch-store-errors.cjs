const fs = require('fs');
const path = './artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('import { toast }')) {
  code = code.replace(
    /import \{ api \} from '@\/lib\/api';/,
    "import { api } from '@/lib/api';\nimport { toast } from '@/components/ui/use-toast';"
  );
}

// Function 1: updateProfile
code = code.replace(
  /const updateProfile = async \(patch: Partial<Profile>\) => \{([\s\S]*?)await api\.updateProfile\(patch\)\.catch\(console\.error\);([\s\S]*?)\};/,
  `const updateProfile = async (patch: Partial<Profile>) => {
    const prev = profile;
    setProfile((p) => (p ? { ...p, ...patch } : (patch as Profile)));
    if (patch.reproductive_mode) setModeState(patch.reproductive_mode);
    if (signedIn) {
      try {
        await api.updateProfile(patch);
      } catch (err: any) {
        setProfile(prev);
        if (prev?.reproductive_mode) setModeState(prev.reproductive_mode);
        toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
        throw err;
      }
    }
  };`
);

// Function 2: togglePeriodDayString
code = code.replace(
  /const togglePeriodDayString = async \(dateStr: string, details\?: Partial<CycleLogItem>\) => \{([\s\S]*?)await api\.removeByDate\('cycle_logs', dateStr\)\.catch\(console\.error\);([\s\S]*?)await api\.insert\('cycle_logs', newEntry as any\)\.catch\(console\.error\);([\s\S]*?)\};/,
  `const togglePeriodDayString = async (dateStr: string, details?: Partial<CycleLogItem>) => {
    const exists = periodDateStrings.includes(dateStr);
    const prevDates = periodDateStrings;
    const prevLogs = cycleLogs;

    const updatedDates = exists
      ? periodDateStrings.filter((d) => d !== dateStr)
      : [...periodDateStrings, dateStr].sort();
    setPeriodDateStrings(updatedDates);

    if (exists) {
      setCycleLogs((prev) => prev.filter((c) => c.period_date !== dateStr));
      if (signedIn) {
        try {
          await api.removeByDate('cycle_logs', dateStr);
        } catch (err) {
          setPeriodDateStrings(prevDates);
          setCycleLogs(prevLogs);
          toast({ title: 'Error', description: 'Failed to delete period log.', variant: 'destructive' });
          throw err;
        }
      }
    } else {
      const newEntry: CycleLogItem = {
        period_date: dateStr,
        flow: details?.flow || 'medium',
        cramps: details?.cramps ?? 3,
        symptoms: details?.symptoms || [],
        notes: details?.notes || '',
      };
      setCycleLogs((prev) => [newEntry, ...prev]);
      if (signedIn) {
        try {
          await api.insert('cycle_logs', newEntry as any);
        } catch (err) {
          setPeriodDateStrings(prevDates);
          setCycleLogs(prevLogs);
          toast({ title: 'Error', description: 'Failed to save period log.', variant: 'destructive' });
          throw err;
        }
      }
    }
  };`
);

// Delete .catch(console.error) for the rest by throwing a script to just run try/catch.
// It's long to do them all via regex, but let's do logPeriodDetails, deletePeriodLog, addMood, deleteMood, addSymptom.
fs.writeFileSync(path, code);

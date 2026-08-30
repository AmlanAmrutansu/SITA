const fs = require('fs');
const path = './artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

// logPeriodDetails
code = code.replace(
  /const logPeriodDetails = async \([\s\S]*?\}\s*\};/m,
  `const logPeriodDetails = async (dateStr: string, details: Partial<CycleLogItem>) => {
    if (signedIn) {
      try {
        await api.insert('cycle_logs', { period_date: dateStr, ...details } as any);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to update period details.', variant: 'destructive' });
        throw err;
      }
    }
    setCycleLogs((prev) => {
      const idx = prev.findIndex((c) => c.period_date === dateStr);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...details };
        return copy;
      }
      return [{ period_date: dateStr, flow: 'medium', cramps: 3, symptoms: [], notes: '', ...details } as CycleLogItem, ...prev];
    });
    if (!periodDateStrings.includes(dateStr)) {
      setPeriodDateStrings((prev) => [...prev, dateStr].sort());
    }
  };`
);

// deletePeriodLog
code = code.replace(
  /const deletePeriodLog = async \([\s\S]*?\}\s*\};/m,
  `const deletePeriodLog = async (dateStr: string) => {
    if (signedIn) {
      try {
        await api.removeByDate('cycle_logs', dateStr);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to delete period log.', variant: 'destructive' });
        throw err;
      }
    }
    setPeriodDateStrings((prev) => prev.filter((d) => d !== dateStr));
    setCycleLogs((prev) => prev.filter((c) => c.period_date !== dateStr));
  };`
);

// addMood
code = code.replace(
  /const addMood = async \([\s\S]*?\}\s*\};/m,
  `const addMood = async (entry: Omit<MoodEntry, 'id' | 'date'> & { logged_at?: string }) => {
    const todayStr = entry.logged_at || new Date().toISOString().slice(0, 10);
    if (signedIn) {
      try {
        await api.insert('moods', {
          mood: entry.mood,
          stress: entry.stress,
          energy: entry.energy,
          sleep: entry.sleep || '7h 20m',
          note: entry.note,
          logged_at: todayStr,
        });
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to save mood.', variant: 'destructive' });
        throw err;
      }
    }
    const newMood: MoodEntry = {
      id: \`m-\${Date.now()}\`,
      date: todayStr,
      mood: entry.mood,
      stress: entry.stress,
      energy: entry.energy,
      sleep: entry.sleep || '7h 20m',
      note: entry.note,
    };
    setMoodEntries((prev) => [newMood, ...prev]);
  };`
);

// deleteMood
code = code.replace(
  /const deleteMood = async \([\s\S]*?\}\s*\};/m,
  `const deleteMood = async (id: string) => {
    if (signedIn && !id.startsWith('m-')) {
      try {
        await api.remove('moods', id);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to delete mood.', variant: 'destructive' });
        throw err;
      }
    }
    setMoodEntries((prev) => prev.filter((m) => m.id !== id));
  };`
);

// addSymptom
code = code.replace(
  /const addSymptom = async \([\s\S]*?\}\s*\};/m,
  `const addSymptom = async (symptom: string, category = 'general', severity: 'mild' | 'moderate' | 'severe' = 'mild', notes?: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (signedIn) {
      try {
        await api.insert('symptom_logs', {
          symptom,
          category,
          severity,
          notes,
          logged_at: todayStr,
        });
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to save symptom.', variant: 'destructive' });
        throw err;
      }
    }
    const newSym: SymptomLogItem = {
      id: \`sym-\${Date.now()}\`,
      symptom,
      category,
      severity,
      logged_at: todayStr,
      notes,
    };
    setSymptomLogs((prev) => [newSym, ...prev]);
  };`
);

fs.writeFileSync(path, code);

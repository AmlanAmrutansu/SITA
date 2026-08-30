const fs = require('fs');
const path = './artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

// Pregnancy & Postpartum
code = code.replace(
  /const updatePregnancyData = async \([\s\S]*?\}\s*\};/m,
  `const updatePregnancyData = async (patch: Partial<PregnancyData>) => {
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, patch);
        } else {
          const res = await api.insert<any>('pregnancy_data', patch as any);
          if (res && res[0]?.id) patch.id = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to update pregnancy data.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, ...patch }));
  };`
);

code = code.replace(
  /const recordKick = async \([\s\S]*?\}\s*\};/m,
  `const recordKick = async () => {
    const current = (pregnancyData.kick_count || 0) + 1;
    const now = new Date().toISOString();
    let newId = undefined;
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, { kick_count: current, last_kick_time: now });
        } else {
          const res = await api.insert<any>('pregnancy_data', { kick_count: current, last_kick_time: now } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to record kick.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, kick_count: current, last_kick_time: now, ...(newId && { id: newId }) }));
  };`
);

code = code.replace(
  /const resetKicks = async \([\s\S]*?\}\s*\};/m,
  `const resetKicks = async () => {
    let newId = undefined;
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, { kick_count: 0 });
        } else {
          const res = await api.insert<any>('pregnancy_data', { kick_count: 0 } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to reset kicks.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, kick_count: 0, ...(newId && { id: newId }) }));
  };`
);

code = code.replace(
  /const addAppointment = async \([\s\S]*?\}\s*\};/m,
  `const addAppointment = async (app: { title: string; date: string; doctor?: string; notes?: string }) => {
    const newApp = { id: \`app-\${Date.now()}\`, ...app };
    const current = pregnancyData.appointments || [];
    const updated = [...current, newApp];
    let newId = undefined;
    if (signedIn) {
      try {
        if (pregnancyData?.id) {
          await api.update('pregnancy_data', pregnancyData.id, { appointments: updated });
        } else {
          const res = await api.insert<any>('pregnancy_data', { appointments: updated } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to add appointment.', variant: 'destructive' });
        throw err;
      }
    }
    setPregnancyData((prev) => ({ ...prev, appointments: updated, ...(newId && { id: newId }) }));
  };`
);

code = code.replace(
  /const updatePostpartumData = async \([\s\S]*?\}\s*\};/m,
  `const updatePostpartumData = async (patch: Partial<PostpartumData>) => {
    if (signedIn) {
      try {
        if (postpartumData?.id) {
          await api.update('postpartum_data', postpartumData.id, patch);
        } else {
          const res = await api.insert<any>('postpartum_data', patch as any);
          if (res && res[0]?.id) patch.id = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to update postpartum data.', variant: 'destructive' });
        throw err;
      }
    }
    setPostpartumData((prev) => ({ ...prev, ...patch }));
  };`
);

code = code.replace(
  /const recordKegel = async \([\s\S]*?\}\s*\};/m,
  `const recordKegel = async () => {
    const count = (postpartumData.kegel_count || 0) + 5;
    let newId = undefined;
    if (signedIn) {
      try {
        if (postpartumData?.id) {
          await api.update('postpartum_data', postpartumData.id, { kegel_count: count });
        } else {
          const res = await api.insert<any>('postpartum_data', { kegel_count: count } as any);
          if (res && res[0]?.id) newId = res[0].id;
        }
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to record Kegels.', variant: 'destructive' });
        throw err;
      }
    }
    setPostpartumData((prev) => ({ ...prev, kegel_count: count, ...(newId && { id: newId }) }));
  };`
);

// clearMessages has a catch(console.error)
code = code.replace(
  /const clearMessages = async \([\s\S]*?\}\s*\};/m,
  `const clearMessages = async () => {
    if (signedIn) {
      try {
        await api.clearChatHistory();
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to clear chat history.', variant: 'destructive' });
        throw err;
      }
    }
    setMessages([]);
  };`
);

fs.writeFileSync(path, code);

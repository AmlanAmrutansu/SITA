import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { type ChatMessage, type Mood, type MoodEntry, type ReproductiveMode } from './mock';
import { api, type Profile, type PCOSScreeningInput, type PCOSScreeningResult, type SymptomTriageInput, type SymptomTriageResult } from '@/lib/api';
import { supabase } from "../lib/supabase";

export interface CycleLogItem {
  id?: string;
  period_date: string;
  end_date?: string;
  flow?: 'light' | 'medium' | 'heavy' | 'spotting';
  cramps?: number;
  symptoms?: string[];
  notes?: string;
}

export interface SymptomLogItem {
  id: string;
  symptom: string;
  category: string;
  severity?: 'mild' | 'moderate' | 'severe';
  logged_at: string;
  notes?: string;
}

export interface PregnancyData {
  id?: string;
  pregnancy_start_date?: string;
  due_date?: string;
  kick_count?: number;
  last_kick_time?: string;
  appointments?: Array<{ id: string; title: string; date: string; doctor?: string; notes?: string }>;
  symptoms?: string[];
  notes?: string;
}

export interface PostpartumData {
  id?: string;
  birth_date?: string;
  bleeding_level?: 'none' | 'light' | 'normal' | 'heavy';
  recovery_stage?: string;
  sleep_hours?: number;
  activity_level?: 'rest' | 'gentle-walking' | 'moderate' | 'active';
  kegel_count?: number;
  notes?: string;
}


export interface MedicalRecord {
  id?: string;
  title: string;
  document_type: string;
  document_date?: string;
  extracted_text?: string;
  structured_data: {
    doctor_name?: string;
    medicines?: string[];
    diagnoses?: string[];
    tests?: string[];
    notes?: string;
  };
  created_at?: string;
}

interface SitaStore {
  profile: Profile | null;
  mode: ReproductiveMode;
  setMode: (mode: ReproductiveMode) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  periodDateStrings: string[];
  cycleLogs: CycleLogItem[];
  togglePeriodDayString: (dateStr: string, details?: Partial<CycleLogItem>) => Promise<void>;
  logPeriodDetails: (dateStr: string, details: Partial<CycleLogItem>) => Promise<void>;
  deletePeriodLog: (dateStr: string) => Promise<void>;
  moodEntries: MoodEntry[];
  addMood: (entry: Omit<MoodEntry, 'id' | 'date'> & { logged_at?: string }) => Promise<void>;
  deleteMood: (id: string) => Promise<void>;
  symptomLogs: SymptomLogItem[];
  addSymptom: (symptom: string, category?: string, severity?: 'mild' | 'moderate' | 'severe', notes?: string) => Promise<void>;
  pregnancyData: PregnancyData;
  updatePregnancyData: (patch: Partial<PregnancyData>) => Promise<void>;
  recordKick: () => Promise<void>;
  resetKicks: () => Promise<void>;
  addAppointment: (app: { title: string; date: string; doctor?: string; notes?: string }) => Promise<void>;

  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => Promise<void>;
  deleteMedicalRecord: (id: string) => Promise<void>;

  postpartumData: PostpartumData;
  updatePostpartumData: (patch: Partial<PostpartumData>) => Promise<void>;
  recordKegel: () => Promise<void>;
  messages: ChatMessage[];
  sendMessage: (text: string, assessmentId?: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  runPCOSScreening: (input: PCOSScreeningInput) => Promise<{ result: PCOSScreeningResult; explanation: string; id?: string }>;
  runSymptomTriage: (input: SymptomTriageInput) => Promise<{ result: SymptomTriageResult; explanation: string; id?: string }>;
  privacy: boolean;
  setPrivacy: (value: boolean) => void;
  notifications: boolean;
  setNotifications: (value: boolean) => void;
  signedIn: boolean;
  user: any;
  loading: boolean;
  signOut: () => Promise<void>;
  exportData: () => void;
  purgeAccountData: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const StoreContext = createContext<SitaStore | null>(null);

const defaultPregnancyData: PregnancyData = {
  due_date: '',
  kick_count: 0,
  appointments: [],
  symptoms: [],
  notes: '',
};

const defaultPostpartumData: PostpartumData = {
  birth_date: '',
  bleeding_level: 'light',
  recovery_stage: 'Fourth Trimester Healing',
  sleep_hours: 7,
  activity_level: 'rest',
  kegel_count: 0,
  notes: '',
};

const welcomeChat: ChatMessage[] = [
  {
    id: 'sita-welcome',
    role: 'sita',
    text: 'Hello! I am SITA, your personal reproductive, cycle, and hormonal wellness companion. How are you feeling today?',
    time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  },
];

export function SitaStoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setModeState] = useState<ReproductiveMode>('not-pregnant');
  const [periodDateStrings, setPeriodDateStrings] = useState<string[]>([]);
  const [cycleLogs, setCycleLogs] = useState<CycleLogItem[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLogItem[]>([]);
  const [pregnancyData, setPregnancyData] = useState<PregnancyData>(defaultPregnancyData);

  const [postpartumData, setPostpartumData] = useState<PostpartumData>(defaultPostpartumData);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>(welcomeChat);
  const [privacy, setPrivacyState] = useState(true);
  const [notifications, setNotificationsState] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSignedIn(false);
        setUser(null);
        setLoading(false);
        return;
      }
      setSignedIn(true);
      setUser(session.user);

      const [
        profileData,
        moodsData,
        cyclesData,
        symptomsData,
        pregData,
        postData,
        chatData,
        recordsData,
      ] = await Promise.all([
        api.profile().catch(() => null),
        api.list<any>('moods', 'logged_at.desc', 50).catch(() => []),
        api.list<any>('cycle_logs', 'period_date.desc', 100).catch(() => []),
        api.list<any>('symptom_logs', 'logged_at.desc', 50).catch(() => []),
        api.list<any>('pregnancy_data', 'id.desc', 1).catch(() => []),
        api.list<any>('postpartum_data', 'id.desc', 1).catch(() => []),
        api.list<any>('chat_messages', 'created_at.asc', 50).catch(() => []),
        api.list<any>('medical_records', 'document_date.desc', 50).catch(() => []),
      ]);

      if (profileData) {
        setProfile(profileData);
        if (profileData.reproductive_mode) setModeState(profileData.reproductive_mode);
        if (profileData.privacy_enabled !== undefined) setPrivacyState(profileData.privacy_enabled);
        if (profileData.notification_preferences?.daily !== undefined) {
          setNotificationsState(profileData.notification_preferences.daily);
        }
      }

      if (moodsData && moodsData.length > 0) {
        setMoodEntries(
          moodsData.map((item: any) => ({
            id: item.id,
            date: item.logged_at,
            mood: item.mood,
            stress: item.stress,
            energy: item.energy,
            sleep: item.sleep || '7h 20m',
            note: item.note,
          }))
        );
      }

      const pDates = new Set<string>();
      if (cyclesData && cyclesData.length > 0) {
        setCycleLogs(cyclesData);
        cyclesData.forEach((c: any) => pDates.add(c.period_date));
      }
      if (profileData?.last_period_date) {
        pDates.add(profileData.last_period_date);
      }
      if (pDates.size > 0) {
        setPeriodDateStrings(Array.from(pDates));
      }

      if (symptomsData && symptomsData.length > 0) {
        setSymptomLogs(symptomsData);
      }

      if (pregData && pregData.length > 0) {
        setPregnancyData({
          ...defaultPregnancyData,
          ...pregData[0],
        });
      }

      if (postData && postData.length > 0) {
        setPostpartumData({
          ...defaultPostpartumData,
          ...postData[0],
        });
      }

      if (chatData && chatData.length > 0) {
        setMessages(
          chatData.map((item: any) => ({
            id: item.id,
            role: item.role === 'assistant' ? 'sita' : 'user',
            text: item.content,
            time: new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          }))
        );
      }
    } catch (err) {
      console.warn('[SITA Store] Load issue:', err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    let mounted = true;
    
    // Initial fetch of session directly from Supabase
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session?.user) {
          setSignedIn(true);
          setUser(session.user);
          refreshAll();
        } else {
          setSignedIn(false);
          setUser(null);
          setLoading(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setSignedIn(true);
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          refreshAll();
        }
      } else {
        setSignedIn(false);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshAll]);



  const addMedicalRecord = async (record: Omit<MedicalRecord, 'id'>) => {
    try {
      const data = await api.insert('medical_records', record);
      if (data && data.length > 0) {
        setMedicalRecords((prev) => [data[0], ...prev]);
      }
    } catch (e) {
      console.error('Failed to add medical record', e);
      throw e;
    }
  };

  const deleteMedicalRecord = async (id: string) => {
    try {
      await api.remove('medical_records', id);
      setMedicalRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error('Failed to delete medical record', e);
      throw e;
    }
  };

  const updateProfile = async (patch: Partial<Profile>) => {
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
  };

  const setMode = async (next: ReproductiveMode) => {
    setModeState(next);
    await updateProfile({ reproductive_mode: next });
  };

  const setPrivacy = (val: boolean) => {
    setPrivacyState(val);
    void updateProfile({ privacy_enabled: val });
  };

  const setNotifications = (val: boolean) => {
    setNotificationsState(val);
    void updateProfile({ notification_preferences: { daily: val, cycle: val, hydration: val } });
  };

  const togglePeriodDayString = async (dateStr: string, details?: Partial<CycleLogItem>) => {
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
  };

  const logPeriodDetails = async (dateStr: string, details: Partial<CycleLogItem>) => {
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
  };

  const deletePeriodLog = async (dateStr: string) => {
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
  };

  const addMood = async (entry: Omit<MoodEntry, 'id' | 'date'> & { logged_at?: string }) => {
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
      id: `m-${Date.now()}`,
      date: todayStr,
      mood: entry.mood,
      stress: entry.stress,
      energy: entry.energy,
      sleep: entry.sleep || '7h 20m',
      note: entry.note,
    };
    setMoodEntries((prev) => [newMood, ...prev]);
  };

  const deleteMood = async (id: string) => {
    if (signedIn && !id.startsWith('m-')) {
      try {
        await api.remove('moods', id);
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to delete mood.', variant: 'destructive' });
        throw err;
      }
    }
    setMoodEntries((prev) => prev.filter((m) => m.id !== id));
  };

  const addSymptom = async (symptom: string, category = 'general', severity: 'mild' | 'moderate' | 'severe' = 'mild', notes?: string) => {
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
      id: `sym-${Date.now()}`,
      symptom,
      category,
      severity,
      logged_at: todayStr,
      notes,
    };
    setSymptomLogs((prev) => [newSym, ...prev]);
  };

  const updatePregnancyData = async (patch: Partial<PregnancyData>) => {
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
  };

  const recordKick = async () => {
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
  };

  const resetKicks = async () => {
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
  };

  const addAppointment = async (app: { title: string; date: string; doctor?: string; notes?: string }) => {
    const newApp = { id: `app-${Date.now()}`, ...app };
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
  };

  const updatePostpartumData = async (patch: Partial<PostpartumData>) => {
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
  };

  const recordKegel = async () => {
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
  };

  const sendMessage = async (text: string, assessmentId?: string) => {
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMsgId = `u-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text, time: now }]);

    if (signedIn) {
      try {
        const { reply } = await api.chat(text, assessmentId);
        setMessages((prev) => [...prev, { id: `s-${Date.now()}`, role: 'sita', text: reply, time: now }]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'sita',
            text: err?.message || 'I could not connect to my assistant service. Please check your network or try again in a moment.',
            time: now,
          },
        ]);
      }
    } else {
      // Offline fallback
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            role: 'sita',
            text: `Thank you for asking, ${profile?.display_name || 'friend'} 🌸. I am here to walk beside you. Remember that symptoms like cramps, fatigue, and mood shifts are signals from your body. To enable full AI intelligence with SITA, please sign in or set up your account.`,
            time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          },
        ]);
      }, 400);
    }
  };

  const clearMessages = async () => {
    if (signedIn) {
      try {
        await api.clearChatHistory();
      } catch (err: any) {
        toast({ title: 'Error', description: 'Failed to clear chat history.', variant: 'destructive' });
        throw err;
      }
    }
    setMessages([]);
  };

  const runPCOSScreening = async (input: PCOSScreeningInput) => {
    return api.pcosScreening(input);
  };

  const runSymptomTriage = async (input: SymptomTriageInput) => {
    return api.symptomTriage(input);
  };

  const signOut = async () => {
    await api.logout().catch(() => undefined);
    setSignedIn(false);
    setUser(null);
    setProfile(null);
    setPeriodDateStrings([]);
    setCycleLogs([]);
    setMoodEntries([]);
    setSymptomLogs([]);
    setPregnancyData(defaultPregnancyData);
    setPostpartumData(defaultPostpartumData);
    setMessages(welcomeChat);
  };

  const exportData = () => {
    window.open(api.exportDataUrl(), '_blank');
  };

  const purgeAccountData = async () => {
    await api.purgeAccountData();
    setSignedIn(false);
    setUser(null);
    setProfile(null);
    setPeriodDateStrings([]);
    setCycleLogs([]);
    setMoodEntries([]);
    setMessages([]);
  };

  const value = useMemo(
    () => ({
      profile,
      mode,
      setMode,
      updateProfile,
      periodDateStrings,
      cycleLogs,
      togglePeriodDayString,
      logPeriodDetails,
      deletePeriodLog,
      moodEntries,
      addMood,
      deleteMood,
      symptomLogs,
      addSymptom,
      pregnancyData,
      updatePregnancyData,
      recordKick,
      resetKicks,
      addAppointment,
      postpartumData,
      updatePostpartumData,
      recordKegel,
      messages,
      sendMessage,
      clearMessages,
      runPCOSScreening,
      runSymptomTriage,
      privacy,
      setPrivacy,
      notifications,
      setNotifications,
      signedIn,
      user,
      loading,
      signOut,
      exportData,
      medicalRecords,
      addMedicalRecord,
      deleteMedicalRecord,
      purgeAccountData,
      refreshAll,
    }),
    [
      profile,
      mode,
      periodDateStrings,
      cycleLogs,
      moodEntries,
      symptomLogs,
      pregnancyData,
      postpartumData,
      messages,
      privacy,
      notifications,
      signedIn,
      user,
      loading,
      refreshAll,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSitaStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useSitaStore must be used inside SitaStoreProvider');
  return context;
}

export type { Mood };

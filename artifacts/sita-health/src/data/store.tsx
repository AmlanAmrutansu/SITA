import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { initialChat, initialMoodEntries, type ChatMessage, type Mood, type MoodEntry, type ReproductiveMode } from './mock';
import { api, type Profile, type PCOSScreeningInput, type PCOSScreeningResult, type SymptomTriageInput, type SymptomTriageResult } from '@/lib/api';

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
  postpartumData: PostpartumData;
  updatePostpartumData: (patch: Partial<PostpartumData>) => Promise<void>;
  recordKegel: () => Promise<void>;
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => Promise<void>;
  runPCOSScreening: (input: PCOSScreeningInput) => Promise<{ result: PCOSScreeningResult; explanation: string }>;
  runSymptomTriage: (input: SymptomTriageInput) => Promise<{ result: SymptomTriageResult; explanation: string }>;
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
  const [messages, setMessages] = useState<ChatMessage[]>(welcomeChat);
  const [privacy, setPrivacyState] = useState(true);
  const [notifications, setNotificationsState] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const session = await api.session();
      if (!session.user) {
        setSignedIn(false);
        setUser(null);
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
      ] = await Promise.all([
        api.profile().catch(() => null),
        api.list<any>('moods', 'logged_at.desc', 50).catch(() => []),
        api.list<any>('cycle_logs', 'period_date.desc', 100).catch(() => []),
        api.list<any>('symptom_logs', 'logged_at.desc', 50).catch(() => []),
        api.list<any>('pregnancy_data').catch(() => []),
        api.list<any>('postpartum_data').catch(() => []),
        api.list<any>('chat_messages', 'created_at.asc', 50).catch(() => []),
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

      if (cyclesData && cyclesData.length > 0) {
        setCycleLogs(cyclesData);
        setPeriodDateStrings(cyclesData.map((c: any) => c.period_date));
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
    refreshAll();
  }, [refreshAll]);

  const updateProfile = async (patch: Partial<Profile>) => {
    setProfile((prev) => (prev ? { ...prev, ...patch } : (patch as Profile)));
    if (patch.reproductive_mode) setModeState(patch.reproductive_mode);
    if (signedIn) {
      await api.updateProfile(patch).catch(console.error);
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
    const updatedDates = exists
      ? periodDateStrings.filter((d) => d !== dateStr)
      : [...periodDateStrings, dateStr].sort();

    setPeriodDateStrings(updatedDates);

    if (exists) {
      setCycleLogs((prev) => prev.filter((c) => c.period_date !== dateStr));
      if (signedIn) {
        await api.removeByDate('cycle_logs', dateStr).catch(console.error);
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
        await api.insert('cycle_logs', newEntry as any).catch(console.error);
      }
    }
  };

  const logPeriodDetails = async (dateStr: string, details: Partial<CycleLogItem>) => {
    if (!periodDateStrings.includes(dateStr)) {
      setPeriodDateStrings((prev) => [...prev, dateStr].sort());
    }
    setCycleLogs((prev) => {
      const idx = prev.findIndex((c) => c.period_date === dateStr);
      const entry: CycleLogItem = {
        period_date: dateStr,
        flow: details.flow || 'medium',
        cramps: details.cramps ?? 3,
        symptoms: details.symptoms || [],
        notes: details.notes || '',
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...entry };
        return next;
      }
      return [entry, ...prev];
    });

    if (signedIn) {
      await api.insert('cycle_logs', { period_date: dateStr, ...details } as any).catch(console.error);
    }
  };

  const deletePeriodLog = async (dateStr: string) => {
    setPeriodDateStrings((prev) => prev.filter((d) => d !== dateStr));
    setCycleLogs((prev) => prev.filter((c) => c.period_date !== dateStr));
    if (signedIn) {
      await api.removeByDate('cycle_logs', dateStr).catch(console.error);
    }
  };

  const addMood = async (entry: Omit<MoodEntry, 'id' | 'date'> & { logged_at?: string }) => {
    const todayStr = entry.logged_at || new Date().toISOString().slice(0, 10);
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
    if (signedIn) {
      await api.insert('moods', {
        mood: entry.mood,
        stress: entry.stress,
        energy: entry.energy,
        sleep: entry.sleep || '7h 20m',
        note: entry.note,
        logged_at: todayStr,
      }).catch(console.error);
    }
  };

  const deleteMood = async (id: string) => {
    setMoodEntries((prev) => prev.filter((m) => m.id !== id));
    if (signedIn && !id.startsWith('m-')) {
      await api.remove('moods', id).catch(console.error);
    }
  };

  const addSymptom = async (symptom: string, category = 'general', severity: 'mild' | 'moderate' | 'severe' = 'mild', notes?: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const newSym: SymptomLogItem = {
      id: `sym-${Date.now()}`,
      symptom,
      category,
      severity,
      logged_at: todayStr,
      notes,
    };
    setSymptomLogs((prev) => [newSym, ...prev]);
    if (signedIn) {
      await api.insert('symptom_logs', {
        symptom,
        category,
        severity,
        notes,
        logged_at: todayStr,
      }).catch(console.error);
    }
  };

  const updatePregnancyData = async (patch: Partial<PregnancyData>) => {
    setPregnancyData((prev) => ({ ...prev, ...patch }));
    if (signedIn) {
      await api.insert('pregnancy_data', patch as any).catch(console.error);
    }
  };

  const recordKick = async () => {
    const current = (pregnancyData.kick_count || 0) + 1;
    const now = new Date().toISOString();
    setPregnancyData((prev) => ({ ...prev, kick_count: current, last_kick_time: now }));
    if (signedIn) {
      await api.insert('pregnancy_data', { kick_count: current, last_kick_time: now } as any).catch(console.error);
    }
  };

  const resetKicks = async () => {
    setPregnancyData((prev) => ({ ...prev, kick_count: 0 }));
    if (signedIn) {
      await api.insert('pregnancy_data', { kick_count: 0 } as any).catch(console.error);
    }
  };

  const addAppointment = async (app: { title: string; date: string; doctor?: string; notes?: string }) => {
    const newApp = { id: `app-${Date.now()}`, ...app };
    const current = pregnancyData.appointments || [];
    const updated = [...current, newApp];
    setPregnancyData((prev) => ({ ...prev, appointments: updated }));
    if (signedIn) {
      await api.insert('pregnancy_data', { appointments: updated } as any).catch(console.error);
    }
  };

  const updatePostpartumData = async (patch: Partial<PostpartumData>) => {
    setPostpartumData((prev) => ({ ...prev, ...patch }));
    if (signedIn) {
      await api.insert('postpartum_data', patch as any).catch(console.error);
    }
  };

  const recordKegel = async () => {
    const count = (postpartumData.kegel_count || 0) + 5;
    setPostpartumData((prev) => ({ ...prev, kegel_count: count }));
    if (signedIn) {
      await api.insert('postpartum_data', { kegel_count: count } as any).catch(console.error);
    }
  };

  const sendMessage = async (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const userMsgId = `u-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text, time: now }]);

    if (signedIn) {
      try {
        const { reply } = await api.chat(text);
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
            text: `Thank you for asking, ${profile?.display_name || 'friend'} 🌸. I am here to walk beside you. Remember that symptoms like cramps, fatigue, and mood shifts are signals from your body. To enable full AI intelligence with Gemini, please sign in or set up your account.`,
            time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          },
        ]);
      }, 400);
    }
  };

  const clearMessages = async () => {
    setMessages([]);
    if (signedIn) {
      await api.clearChatHistory().catch(console.error);
    }
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

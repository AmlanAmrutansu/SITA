import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { initialChat, initialMoodEntries, type ChatMessage, type Mood, type MoodEntry, type ReproductiveMode } from './mock';
import { api } from '@/lib/api';

interface SitaStore {
  mode: ReproductiveMode;
  setMode: (mode: ReproductiveMode) => void;
  periodDays: number[];
  togglePeriodDay: (day: number) => void;
  moodEntries: MoodEntry[];
  addMood: (entry: Omit<MoodEntry, 'id' | 'date'>) => void;
  messages: ChatMessage[];
  sendMessage: (text: string) => void;
  privacy: boolean;
  setPrivacy: (value: boolean) => void;
  signedIn: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const StoreContext = createContext<SitaStore | null>(null);

export function SitaStoreProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ReproductiveMode>('not-pregnant');
  const [periodDays, setPeriodDays] = useState([17, 18, 19, 20, 21]);
  const [moodEntries, setMoodEntries] = useState(initialMoodEntries);
  const [messages, setMessages] = useState(initialChat);
  const [privacy, setPrivacy] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await api.session();
        if (!active || !session.user) return;
        setSignedIn(true);
        const [profile, moods, cycles, chat] = await Promise.all([
          api.profile().catch(() => null),
          api.list<any>('moods').catch(() => []),
          api.list<any>('cycle_logs').catch(() => []),
          api.list<any>('chat_messages').catch(() => []),
        ]);
        if (profile?.reproductive_mode) setMode(profile.reproductive_mode);
        if (profile?.privacy_enabled !== undefined) setPrivacy(profile.privacy_enabled);
        if (moods.length) setMoodEntries(moods.map((item: any) => ({ id: item.id, date: item.logged_at, mood: item.mood, stress: item.stress, energy: item.energy, sleep: item.sleep, note: item.note })));
        if (cycles.length) setPeriodDays(cycles.map((item: any) => Number(String(item.period_date).slice(-2))));
        if (chat.length) setMessages(chat.map((item: any) => ({ id: item.id, role: item.role === 'assistant' ? 'sita' : 'user', text: item.content, time: new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);
  const persistProfile = (patch: Record<string, unknown>) => {
    if (signedIn) void api.updateProfile(patch).catch(console.error);
  };
  const changeMode = (next: ReproductiveMode) => { setMode(next); persistProfile({ reproductive_mode: next }); };
  const changePrivacy = (next: boolean) => { setPrivacy(next); persistProfile({ privacy_enabled: next }); };
  const togglePeriodDay = (day: number) => setPeriodDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b));
  const addMood = (entry: Omit<MoodEntry, 'id' | 'date'>) => {
    setMoodEntries((current) => [{ ...entry, id: `m-${Date.now()}`, date: 'Today' }, ...current]);
    if (signedIn) void api.insert('moods', { ...entry, logged_at: new Date().toISOString().slice(0, 10) }).catch(console.error);
  };
  const sendMessage = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text, time: now }]);
    if (signedIn) void api.chat(text).then(({ reply }) => setMessages((current) => [...current, { id: `s-${Date.now()}`, role: 'sita', text: reply, time: now }])).catch(() => setMessages((current) => [...current, { id: `s-${Date.now()}`, role: 'sita', text: "I couldn't reach my secure assistant right now. Please try again in a moment.", time: now }]));
    else setMessages((current) => [...current, { id: `s-${Date.now() + 1}`, role: 'sita', text: "Thank you for sharing that with me. Let's take it one gentle step at a time. I can help you notice patterns, but I can't diagnose symptoms. If something feels worrying or severe, please reach out to a healthcare professional.", time: now }]);
  };
  const signOut = async () => { await api.logout().catch(() => undefined); setSignedIn(false); };
  const value = useMemo(() => ({ mode, setMode: changeMode, periodDays, togglePeriodDay, moodEntries, addMood, messages, sendMessage, privacy, setPrivacy: changePrivacy, signedIn, loading, signOut }), [mode, periodDays, moodEntries, messages, privacy, signedIn, loading]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSitaStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useSitaStore must be used inside SitaStoreProvider');
  return context;
}

export type { Mood };
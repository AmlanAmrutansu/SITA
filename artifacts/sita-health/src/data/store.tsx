import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { initialChat, initialMoodEntries, type ChatMessage, type Mood, type MoodEntry, type ReproductiveMode } from './mock';

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
}

const StoreContext = createContext<SitaStore | null>(null);

export function SitaStoreProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ReproductiveMode>('not-pregnant');
  const [periodDays, setPeriodDays] = useState([17, 18, 19, 20, 21]);
  const [moodEntries, setMoodEntries] = useState(initialMoodEntries);
  const [messages, setMessages] = useState(initialChat);
  const [privacy, setPrivacy] = useState(true);
  const togglePeriodDay = (day: number) => setPeriodDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b));
  const addMood = (entry: Omit<MoodEntry, 'id' | 'date'>) => setMoodEntries((current) => [{ ...entry, id: `m-${Date.now()}`, date: 'Today' }, ...current]);
  const sendMessage = (text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    setMessages((current) => [...current, { id: `u-${Date.now()}`, role: 'user', text, time: now }, { id: `s-${Date.now() + 1}`, role: 'sita', text: "Thank you for sharing that with me. Let's take it one gentle step at a time. I can help you notice patterns, but I can't diagnose symptoms. If something feels worrying or severe, please reach out to a healthcare professional.", time: now }]);
  };
  const value = useMemo(() => ({ mode, setMode, periodDays, togglePeriodDay, moodEntries, addMood, messages, sendMessage, privacy, setPrivacy }), [mode, periodDays, moodEntries, messages, privacy]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useSitaStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useSitaStore must be used inside SitaStoreProvider');
  return context;
}

export type { Mood };
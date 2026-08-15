export type ReproductiveMode = 'not-pregnant' | 'pregnant' | 'postpartum';
export type Mood = 'Very happy' | 'Good' | 'Okay' | 'Low' | 'Stressed';

export interface MoodEntry {
  id: string;
  date: string;
  mood: Mood;
  stress: number;
  energy: number;
  sleep: string;
  note?: string;
}

export interface ChatMessage {
  id: string;
  role: 'sita' | 'user';
  text: string;
  time: string;
}

export const moods: { label: Mood; color: string; icon: string }[] = [
  { label: 'Very happy', color: '#e6b56c', icon: 'sun' },
  { label: 'Good', color: '#e99aab', icon: 'smile' },
  { label: 'Okay', color: '#b8a7d6', icon: 'cloud' },
  { label: 'Low', color: '#9ab6c7', icon: 'moon' },
  { label: 'Stressed', color: '#dca58e', icon: 'wind' },
];

export const initialMoodEntries: MoodEntry[] = [
  { id: 'm-1', date: '14 Aug', mood: 'Good', stress: 3, energy: 7, sleep: '7h 20m', note: 'A gentle, focused day.' },
  { id: 'm-2', date: '13 Aug', mood: 'Okay', stress: 5, energy: 5, sleep: '6h 45m' },
  { id: 'm-3', date: '12 Aug', mood: 'Very happy', stress: 2, energy: 8, sleep: '8h 10m' },
  { id: 'm-4', date: '11 Aug', mood: 'Good', stress: 4, energy: 6, sleep: '7h 05m' },
];

export const initialChat: ChatMessage[] = [
  { id: 'c-1', role: 'sita', text: 'Hello, Tanvi. How can I help you today?', time: '9:41 AM' },
  { id: 'c-2', role: 'user', text: "I've been having cramps for the last two days.", time: '9:42 AM' },
  { id: 'c-3', role: 'sita', text: "I'm sorry to hear that. Cramps can happen for many reasons, from hormonal changes, stress, dehydration or digestion. Staying hydrated, using gentle warmth, and resting can help. Would you like some tips that might help?", time: '9:42 AM' },
];

export const cycleDays = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31];
export const periodDays = [17, 18, 19, 20, 21];

export const navItems = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/cycle', label: 'Cycle', icon: 'calendar' },
  { href: '/mood', label: 'Mood', icon: 'smile' },
  { href: '/sita', label: 'SITA', icon: 'sparkles' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const;

export const modeDetails = {
  'not-pregnant': { title: 'Not pregnant', detail: 'Track your cycle and understand your patterns.', tint: 'rose' },
  pregnant: { title: 'Pregnant', detail: 'Get pregnancy-focused information and support.', tint: 'lavender' },
  postpartum: { title: 'Postpartum', detail: 'Get support and track your recovery after childbirth.', tint: 'green' },
} as const;
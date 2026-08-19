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
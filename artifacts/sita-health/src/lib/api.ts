export interface Session {
  user: { id: string; email?: string; user_metadata?: { display_name?: string } } | null;
}

export interface SignupResponse extends Session {
  needsEmailConfirmation?: boolean;
}

export interface Profile {
  id: string;
  name?: string;
  display_name: string;
  reproductive_mode: 'not-pregnant' | 'pregnant' | 'postpartum';
  privacy_enabled: boolean;
  onboarding_complete: boolean;
  date_of_birth?: string | null;
  typical_cycle_length?: number | null;
  typical_period_length?: number | null;
  last_period_date?: string | null;
  health_notes?: string | null;
  notification_preferences?: { daily?: boolean; cycle?: boolean; hydration?: boolean };
}

export interface PCOSScreeningInput {
  irregularCycles: boolean;
  cycleLengthDays?: number;
  excessHairGrowth: boolean;
  persistentAcne: boolean;
  hairThinning: boolean;
  weightChallenges: boolean;
  familyHistory: boolean;
  pelvicPain: boolean;
}

export interface PCOSScreeningResult {
  screeningType: 'pcos';
  riskLevel: 'low' | 'moderate' | 'elevated';
  score: number;
  criteriaMatched: string[];
  summary: string;
  recommendations: string[];
  disclaimer: string;
}

export interface SymptomTriageInput {
  symptom: string;
  durationDays: number;
  severity: 'mild' | 'moderate' | 'severe';
  hasFever: boolean;
  heavyBleeding: boolean;
  severePain: boolean;
  dizzinessOrFainting: boolean;
  reproductiveMode: 'not-pregnant' | 'pregnant' | 'postpartum';
}

export interface SymptomTriageResult {
  screeningType: 'symptom_triage';
  riskLevel: 'low' | 'moderate' | 'elevated' | 'prompt_attention';
  category: 'General information / monitor' | 'Consider contacting a healthcare professional' | 'Prompt medical evaluation';
  summary: string;
  actionSteps: string[];
  warningSigns: string[];
  disclaimer: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? 'Something went wrong.');
  }
  return data as T;
}

export const api = {
  session: () => request<Session>('/auth/session'),
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, password: string, displayName: string) =>
    request<SignupResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),
  googleUrl: () => '/api/auth/google',
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  profile: () => request<Profile | null>('/me'),
  updateProfile: (profile: Partial<Profile>) =>
    request<Profile>('/me', { method: 'PATCH', body: JSON.stringify(profile) }),
  list: <T>(table: string, order?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (order) params.set('order', order);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<T[]>(`/data/${table}${qs}`);
  },
  insert: <T>(table: string, row: Record<string, unknown>) =>
    request<T>(`/data/${table}`, { method: 'POST', body: JSON.stringify(row) }),
  update: <T>(table: string, id: string, row: Record<string, unknown>) =>
    request<T>(`/data/${table}/${id}`, { method: 'PATCH', body: JSON.stringify(row) }),
  remove: (table: string, id: string) => request<void>(`/data/${table}/${id}`, { method: 'DELETE' }),
  removeByDate: (table: string, date: string) =>
    request<void>(`/data/${table}/by-date/${date}`, { method: 'DELETE' }),
  chat: (text: string) => request<{ reply: string }>('/chat', { method: 'POST', body: JSON.stringify({ text }) }),
  chatHistory: () => request<{ messages: any[] }>('/chat/history'),
  clearChatHistory: () => request<{ message: string }>('/chat/history', { method: 'DELETE' }),
  pcosScreening: (input: PCOSScreeningInput) =>
    request<{ result: PCOSScreeningResult; explanation: string }>('/screening/pcos', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  symptomTriage: (input: SymptomTriageInput) =>
    request<{ result: SymptomTriageResult; explanation: string }>('/screening/triage', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  exportDataUrl: () => '/api/data-export',
  purgeAccountData: () => request<{ message: string }>('/data-purge', { method: 'DELETE' }),
};

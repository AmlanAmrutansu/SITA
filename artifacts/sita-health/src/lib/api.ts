import { supabase } from './supabase';
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
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers ?? {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message ?? 'Something went wrong.');
  }
  return data as T;
}

export const api = {
  session: async () => {
    const { data } = await supabase.auth.getSession();
    return { user: data.session?.user ?? null };
  },
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user };
  },
  signup: async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (error) throw new Error(error.message);
    return { user: data.user, needsEmailConfirmation: !data.session };
  },
  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });
    if (error) throw new Error(error.message);
  },
  logout: async () => {
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  },
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
  chat: (text: string, assessmentId?: string, imageBase64?: string) =>
    request<{ reply: string; extracted_document?: any }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ text, assessmentId, imageBase64 }),
    }),
  chatHistory: () => request<{ messages: any[] }>('/chat/history'),
  clearChatHistory: () => request<{ message: string }>('/chat/history', { method: 'DELETE' }),
  pcosScreening: (input: PCOSScreeningInput) =>
    request<{ result: PCOSScreeningResult; explanation: string; id?: string }>('/screening/pcos', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  symptomTriage: (input: SymptomTriageInput) =>
    request<{ result: SymptomTriageResult; explanation: string; id?: string }>('/screening/triage', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  exportDataUrl: () => '/api/data-export',
  purgeAccountData: () => request<{ message: string }>('/data-purge', { method: 'DELETE' }),
  extractMedicalRecord: (imageBase64?: string, rawText?: string, documentTypeHint?: string) =>
    request<{ success: boolean; extracted_text: string; structured_data: any }>('/extract-medical-record', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, rawText, documentTypeHint }),
    }),
  compareMedicalRecords: (currentRecord: any, previousRecords?: any[]) =>
    request<{ success: boolean; comparison: any }>('/medical-records/compare', {
      method: 'POST',
      body: JSON.stringify({ currentRecord, previousRecords }),
    }),
  generateDoctorSummary: () =>
    request<{ success: boolean; summaryReport: any }>('/medical-records/doctor-summary', {
      method: 'POST',
    }),
};

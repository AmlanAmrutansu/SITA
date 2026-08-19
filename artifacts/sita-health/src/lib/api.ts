export interface Session {
  user: { id: string; email?: string; user_metadata?: { display_name?: string } } | null;
}
export interface SignupResponse extends Session {
  needsEmailConfirmation?: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? 'Something went wrong.');
  return data as T;
}

export const api = {
  session: () => request<Session>('/auth/session'),
  login: (email: string, password: string) => request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup: (email: string, password: string, displayName: string) => request<SignupResponse>('/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  profile: () => request<any>('/me'),
  updateProfile: (profile: Record<string, unknown>) => request<any>('/me', { method: 'PATCH', body: JSON.stringify(profile) }),
  list: <T>(table: string) => request<T[]>(`/data/${table}`),
  insert: <T>(table: string, row: Record<string, unknown>) => request<T>(`/data/${table}`, { method: 'POST', body: JSON.stringify(row) }),
  chat: (text: string) => request<{ reply: string }>('/chat', { method: 'POST', body: JSON.stringify({ text }) }),
};
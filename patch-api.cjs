const fs = require('fs');

let content = fs.readFileSync('artifacts/sita-health/src/lib/api.ts', 'utf8');

// Insert import at the top
content = `import { supabase } from './supabase';\n` + content;

// Update request function to attach token
content = content.replace(
  `async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(\`/api\${path}\`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });`,
  `async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers ?? {}) };
  if (token) {
    headers['Authorization'] = \`Bearer \${token}\`;
  }
  const response = await fetch(\`/api\${path}\`, {
    ...init,
    headers,
  });`
);

// Replace Auth methods
content = content.replace(
  `  session: () => request<Session>('/auth/session'),`,
  `  session: async () => {
    const { data } = await supabase.auth.getSession();
    return { user: data.session?.user ?? null };
  },`
);

content = content.replace(
  `  login: (email: string, password: string) =>\n    request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),`,
  `  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { user: data.user };
  },`
);

content = content.replace(
  `  signup: (email: string, password: string, displayName: string) =>\n    request<SignupResponse>('/auth/signup', {\n      method: 'POST',\n      body: JSON.stringify({ email, password, displayName }),\n    }),`,
  `  signup: async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (error) throw new Error(error.message);
    return { user: data.user, needsEmailConfirmation: !data.session };
  },`
);

content = content.replace(
  `  logout: () => request<void>('/auth/logout', { method: 'POST' }),`,
  `  logout: async () => {
    await supabase.auth.signOut();
  },`
);

fs.writeFileSync('artifacts/sita-health/src/lib/api.ts', content);


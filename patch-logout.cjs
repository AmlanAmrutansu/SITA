const fs = require('fs');

let content = fs.readFileSync('artifacts/sita-health/src/lib/api.ts', 'utf8');

content = content.replace(
  `  logout: async () => {
    await supabase.auth.signOut();
  },`,
  `  logout: async () => {
    await supabase.auth.signOut();
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  },`
);

fs.writeFileSync('artifacts/sita-health/src/lib/api.ts', content);


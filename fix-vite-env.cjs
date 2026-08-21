const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/vite.config.ts', 'utf8');

const mapEnvCode = `
// Map backend Netlify environment variables to frontend VITE_ variables if they are missing
if (process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (process.env.SUPABASE_ANON_KEY && !process.env.VITE_SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}
`;

content = content.replace(
  'const port = Number(process.env.PORT || 3000);',
  mapEnvCode + '\nconst port = Number(process.env.PORT || 3000);'
);

fs.writeFileSync('artifacts/sita-health/vite.config.ts', content);

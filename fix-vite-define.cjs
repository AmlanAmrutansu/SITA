const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/vite.config.ts', 'utf8');

if (!content.includes('define: {')) {
  content = content.replace(
    '  base: basePath,',
    `  base: basePath,
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '')
  },`
  );
  fs.writeFileSync('artifacts/sita-health/vite.config.ts', content);
}

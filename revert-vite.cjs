const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/vite.config.ts', 'utf8');
content = content.replace(
  /  define: \{\n    'import\.meta\.env\.VITE_SUPABASE_URL': [^\}]+\n  \},\n/,
  ''
);
fs.writeFileSync('artifacts/sita-health/vite.config.ts', content);

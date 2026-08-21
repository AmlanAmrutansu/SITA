const fs = require('fs');

let file = 'artifacts/api-server/src/lib/supabase.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `  if (accessToken) {
    headers["Authorization"] = \`Bearer \${accessToken}\`;
  } else if (supabaseAnonKey) {
    headers["apikey"] = supabaseAnonKey;
    headers["Authorization"] = \`Bearer \${supabaseAnonKey}\`;
  }`,
  `  if (supabaseAnonKey) {
    headers["apikey"] = supabaseAnonKey;
  }
  
  if (accessToken) {
    headers["Authorization"] = \`Bearer \${accessToken}\`;
  } else if (supabaseAnonKey) {
    headers["Authorization"] = \`Bearer \${supabaseAnonKey}\`;
  }`
);

fs.writeFileSync(file, content);

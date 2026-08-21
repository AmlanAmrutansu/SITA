const fs = require('fs');

let content = fs.readFileSync('artifacts/sita-health/package.json', 'utf8');
const pkg = JSON.parse(content);
pkg.dependencies['@supabase/supabase-js'] = '^2.45.1';
fs.writeFileSync('artifacts/sita-health/package.json', JSON.stringify(pkg, null, 2));


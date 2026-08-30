const fs = require('fs');
const path = './artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/content = \\\`\\\$\\{i \+ 1\\}\\\`;/, "content = `${i + 1}`;");

fs.writeFileSync(path, code);

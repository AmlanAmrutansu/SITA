const fs = require('fs');
let content = fs.readFileSync('scripts/package.json', 'utf8');
content = content.replace('"version": "0.0.0"', '"version": "1.0.0"');
fs.writeFileSync('scripts/package.json', content);

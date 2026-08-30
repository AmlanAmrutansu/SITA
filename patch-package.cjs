const fs = require('fs');

function addName(file, name) {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  content.name = name;
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
}

addName('artifacts/api-server/package.json', 'api-server');
addName('artifacts/sita-health/package.json', 'sita-health');

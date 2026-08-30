const fs = require('fs');

function addNameTop(file, name) {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  delete content.name;
  const newContent = { name, ...content };
  fs.writeFileSync(file, JSON.stringify(newContent, null, 2));
}

addNameTop('artifacts/api-server/package.json', 'api-server');
addNameTop('artifacts/sita-health/package.json', 'sita-health');

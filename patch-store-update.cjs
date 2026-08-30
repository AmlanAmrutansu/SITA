const fs = require('fs');
const path = './artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/api\.request\(`\/data\/pregnancy_data\/\$\{pregnancyData\.id\}`,\s*\{\s*method:\s*'PATCH',\s*body:\s*JSON\.stringify\((.*?)\)\s*\}\)/g, 'api.update("pregnancy_data", pregnancyData.id, $1)');

code = code.replace(/api\.request\(`\/data\/postpartum_data\/\$\{postpartumData\.id\}`,\s*\{\s*method:\s*'PATCH',\s*body:\s*JSON\.stringify\((.*?)\)\s*\}\)/g, 'api.update("postpartum_data", postpartumData.id, $1)');

fs.writeFileSync(path, code);

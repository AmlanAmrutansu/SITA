const fs = require('fs');
const glob = require('fast-glob');

const files = glob.sync('**/package.json', { ignore: ['**/node_modules/**'] });
for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(`${file}: name=${data.name}, version='${data.version}'`);
  if (data.dependencies) {
    for (const [k, v] of Object.entries(data.dependencies)) {
      if (!v || v.trim() === '') console.log(`  BAD DEP: ${k} = '${v}'`);
    }
  }
  if (data.devDependencies) {
    for (const [k, v] of Object.entries(data.devDependencies)) {
      if (!v || v.trim() === '') console.log(`  BAD DEV DEP: ${k} = '${v}'`);
    }
  }
}

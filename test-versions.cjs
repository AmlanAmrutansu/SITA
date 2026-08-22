const fs = require('fs');
const execSync = require('child_process').execSync;
const files = execSync('find . -name "package.json" -not -path "*/node_modules/*"').toString().trim().split('\n');
for (const f of files) {
  if (!f) continue;
  const pkg = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (pkg.version === '') console.log('EMPTY VERSION IN', f);
  if (pkg.version === undefined) console.log('UNDEFINED VERSION IN', f);
  if (typeof pkg.version !== 'string') console.log('NON STRING VERSION IN', f);
  
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  for (const [name, ver] of Object.entries(allDeps)) {
    if (ver === '') console.log('EMPTY DEP', name, 'IN', f);
    if (ver === undefined) console.log('UNDEFINED DEP', name, 'IN', f);
  }
}
console.log('Done scanning.');

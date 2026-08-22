const fs = require('fs');
const execSync = require('child_process').execSync;
const files = execSync('find . -name "package.json" -not -path "*/node_modules/*"').toString().trim().split('\n');
const deps = {};
const devDeps = {};
for (const f of files) {
  if (!f) continue;
  const pkg = JSON.parse(fs.readFileSync(f));
  for (const p of Object.keys(pkg.dependencies || {})) {
    if (!deps[p]) deps[p] = [];
    deps[p].push(f);
  }
  for (const p of Object.keys(pkg.devDependencies || {})) {
    if (!devDeps[p]) devDeps[p] = [];
    devDeps[p].push(f);
  }
}
for (const p of Object.keys(deps)) {
  if (devDeps[p]) {
    console.log('CONFLICT:', p, 'is dep in', deps[p], 'and devDep in', devDeps[p]);
  }
}

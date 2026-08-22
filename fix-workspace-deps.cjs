const fs = require('fs');
const path = require('path');
function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      if (file === 'node_modules') {
        if (!--pending) done(null, results);
        return;
      }
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('package.json')) results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}
walk('.', function(err, files) {
  for (let file of files) {
    try {
      let data = JSON.parse(fs.readFileSync(file));
      let changed = false;
      for (let deps of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (!data[deps]) continue;
        for (let [k, v] of Object.entries(data[deps])) {
          if (k.startsWith('@workspace/')) {
            data[deps][k] = '^1.0.0';
            changed = true;
          }
        }
      }
      if (changed) {
        fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
        console.log("Updated", file);
      }
    } catch(e){}
  }
});

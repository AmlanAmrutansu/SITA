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
  if (err) throw err;
  for (const file of files) {
    try {
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
    } catch (e) {}
  }
});

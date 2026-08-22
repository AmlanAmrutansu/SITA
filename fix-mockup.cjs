const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('artifacts/mockup-sandbox/package.json', 'utf8'));

pkg.devDependencies = {};
const devNames = ['@replit/vite-plugin-cartographer', '@replit/vite-plugin-runtime-error-modal', '@tailwindcss/vite', '@types/node', '@types/react', '@types/react-dom', '@vitejs/plugin-react', 'vite', 'chokidar', 'fast-glob', 'tailwindcss-animate'];

for (const name of devNames) {
  if (pkg.dependencies[name]) {
    pkg.devDependencies[name] = pkg.dependencies[name];
    delete pkg.dependencies[name];
  }
}

fs.writeFileSync('artifacts/mockup-sandbox/package.json', JSON.stringify(pkg, null, 2));

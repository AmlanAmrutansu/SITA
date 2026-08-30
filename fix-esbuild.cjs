const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.build = "vite build --config artifacts/sita-health/vite.config.ts && esbuild server.ts --bundle --platform=node --format=cjs --sourcemap --outfile=dist/server.cjs --external:express --external:cors --external:cookie-parser --external:tesseract.js --external:pino-http --external:dotenv";
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));

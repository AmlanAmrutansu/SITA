const fs = require('fs');
let content = fs.readFileSync('artifacts/api-server/build.mjs', 'utf8');

content = content.replace(
  'esbuildPluginPino({ transports: ["pino-pretty"] })',
  '// esbuildPluginPino({ transports: ["pino-pretty"] })'
);

fs.writeFileSync('artifacts/api-server/build.mjs', content);

const fs = require('fs');
let content = fs.readFileSync('artifacts/api-server/src/lib/logger.ts', 'utf8');

content = content.replace(
  '  ...(isProduction',
  `// Transport removed to prevent Netlify serverless bundle crashes
  // (process.env.NODE_ENV check is sometimes unreliable in Lambda runtime)
  // ...(isProduction`
);
content = content.replace(
  '    ? {}',
  '  //   ? {}'
);
content = content.replace(
  '    : {',
  '  //   : {'
);
content = content.replace(
  '        transport: {',
  '  //       transport: {'
);
content = content.replace(
  '          target: "pino-pretty",',
  '  //         target: "pino-pretty",'
);
content = content.replace(
  '          options: { colorize: true },',
  '  //         options: { colorize: true },'
);
content = content.replace(
  '        },',
  '  //       },'
);
content = content.replace(
  '      }),',
  '  //     }),'
);

fs.writeFileSync('artifacts/api-server/src/lib/logger.ts', content);

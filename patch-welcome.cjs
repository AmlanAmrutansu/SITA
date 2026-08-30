const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove mode="wait" and update animation
code = code.replace(
  '<AnimatePresence mode="wait">',
  '<AnimatePresence>'
);

code = code.replace(
  "initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}",
  "initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}"
);
code = code.replace(
  "animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}",
  "animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}"
);
code = code.replace(
  "exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}",
  "exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}"
);
code = code.replace(
  "transition={{ duration: 0.4 }}",
  "transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}"
);

fs.writeFileSync(path, code);

const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}",
  "initial={{ opacity: 0, scale: 0.95 }}"
);
code = code.replace(
  "animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}",
  "animate={{ opacity: 1, scale: 1 }}"
);
code = code.replace(
  "exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}",
  "exit={{ opacity: 0, scale: 1.05 }}"
);

// Add mode="wait" to AnimatePresence
code = code.replace(
  "<AnimatePresence>",
  "<AnimatePresence mode=\"wait\">"
);

// For mode="wait" to work cleanly, change inset-0 absolute to relative for the children, 
// or keep absolute if it looks fine. wait removes the element before bringing the new one in, so it doesn't need to be absolute if we want it to flow normally, but absolute is fine.

fs.writeFileSync(path, code);
console.log("Animation fixed");

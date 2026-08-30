const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Remove mix-blend-multiply
code = code.replace(
  'mix-blend-multiply',
  ''
);

// Simplify the glass panel classes for better rendering compatibility while maintaining the look
code = code.replace(
  'className="absolute inset-0 rounded-[3rem] border border-white/80 bg-gradient-to-br from-white/60 via-white/30 to-[#fce8ef]/20 p-6 sm:p-8 shadow-[0_30px_60px_-15px_rgba(214,95,138,0.3),inset_0_2px_15px_rgba(255,255,255,0.8)] backdrop-blur-3xl overflow-hidden flex flex-col"',
  'className="absolute inset-0 rounded-[3rem] border border-white/80 bg-white/40 p-6 sm:p-8 shadow-[0_15px_40px_-15px_rgba(214,95,138,0.2),inset_0_1px_5px_rgba(255,255,255,0.8)] backdrop-blur-2xl overflow-hidden flex flex-col"'
);

fs.writeFileSync(path, code);
console.log("Glass UI fixed");

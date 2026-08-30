const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace the main glass container classes
code = code.replace(
  'className="absolute inset-0 rounded-[2.5rem] border border-white/60 bg-white/40 p-6 sm:p-8 shadow-[0_8px_40px_rgba(152,126,145,0.08),inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-2xl overflow-hidden flex flex-col"',
  'className="absolute inset-0 rounded-[3rem] border border-white/80 bg-gradient-to-br from-white/60 via-white/30 to-[#fce8ef]/20 p-6 sm:p-8 shadow-[0_30px_60px_-15px_rgba(214,95,138,0.3),inset_0_2px_15px_rgba(255,255,255,0.8)] backdrop-blur-3xl overflow-hidden flex flex-col"'
);

// Enhance background orbs for richer blush feel
code = code.replace(
  'bg-[#fce8ef] opacity-50 blur-[120px]',
  'bg-gradient-to-r from-[#ffd1e3] to-[#f4b6cc] opacity-70 blur-[140px]'
);
code = code.replace(
  'bg-[#ebe4f5] opacity-50 blur-[140px]',
  'bg-gradient-to-r from-[#e7d8f3] to-[#fce8ef] opacity-70 blur-[160px]'
);

// Add an extra glowing orb directly behind the showcase
code = code.replace(
  '{/* RIGHT: ANIMATED SHOWCASE */}',
  `{/* RIGHT: ANIMATED SHOWCASE */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-[#ffd1e3]/40 to-[#d65f8a]/20 blur-[80px] rounded-full z-0 pointer-events-none mix-blend-multiply" />`
);

// Also remove discrete white borders from feature demo components and make them more blended
code = code.replace(/bg-white\/80 shadow-sm border border-white/g, 'bg-white/60 shadow-lg border border-white/50');
code = code.replace(/bg-white shadow-sm/g, 'bg-white/80 shadow-md border border-white/50');
code = code.replace(/bg-\[#fce8ef\]\/70 border border-\[#d65f8a\]\/20/g, 'bg-gradient-to-br from-[#fce8ef]/80 to-white/40 border border-[#d65f8a]/30 shadow-inner');
code = code.replace(/bg-\[#8c6b84\]\/5 border border-\[#8c6b84\]\/15/g, 'bg-[#8c6b84]/10 border border-[#8c6b84]/20 shadow-sm');


fs.writeFileSync(path, code);

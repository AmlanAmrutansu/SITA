const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');

const startIdx = content.indexOf('export function WelcomePage() {');
const endIdx = content.indexOf('// ==========================================\n// AUTH PAGE');
if (startIdx !== -1 && endIdx !== -1) {
  const replacementStr = `export function WelcomePage() {
  const [, setLocation] = useLocation();

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-[#faf7f9] px-6 py-12 selection:bg-[#fce8ef] selection:text-[#5d4662]">
      <div className="absolute -left-32 top-[-10%] h-[40rem] w-[40rem] animate-pulse rounded-full bg-[#fce8ef] opacity-50 blur-[120px] duration-[8000ms]" />
      <div className="absolute -right-32 bottom-[-10%] h-[45rem] w-[45rem] animate-pulse rounded-full bg-[#ebe4f5] opacity-50 blur-[140px] duration-[10000ms]" />
      
      <div className="relative z-10 flex w-full max-w-[480px] flex-col items-center text-center">
        <div className="fade-up mb-8 flex justify-center">
          <OriginalSitaMark className="h-28 w-28 drop-shadow-[0_12px_24px_rgba(212,100,137,0.15)]" />
        </div>
        
        <div className="fade-up fade-up-1">
          <h1 className="mb-4 font-display text-[4rem] leading-none tracking-[-.04em] text-[#4c3850]">
            SITA
          </h1>
          <h2 className="mx-auto mb-10 max-w-[300px] text-[11px] font-bold uppercase leading-[1.8] tracking-[0.2em] text-[#9b8599]">
            Smart Intelligence for<br />Treatment &amp; Awareness
          </h2>
        </div>

        <div className="fade-up fade-up-2 mb-12 relative w-full overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-8 shadow-[0_8px_32px_rgba(152,126,145,0.08),inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-2xl">
          <p className="font-display text-[1.4rem] leading-snug text-[#5d4662]">
            Your health.<br />
            <span className="text-[#9f6a80]">Your journey.</span><br />
            Your SITA.
          </p>
          <p className="mx-auto mt-5 max-w-[280px] text-[14px] leading-relaxed text-[#7a6575]">
            A private, intelligent space made for understanding your reproductive wellness, cycle, and mood.
          </p>
        </div>

        <div className="fade-up fade-up-3 flex w-full flex-col gap-4 sm:flex-row">
          <button
            onClick={() => setLocation('/auth')}
            className="group flex w-full items-center justify-center gap-3 rounded-full bg-[#5d4662] px-6 py-4 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(93,70,98,.2)] transition-all hover:-translate-y-0.5 hover:bg-[#4a364e] hover:shadow-[0_12px_24px_rgba(93,70,98,.3)]"
          >
            Get Started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => setLocation('/auth')}
            className="flex w-full items-center justify-center rounded-full border-2 border-[#5d4662]/10 bg-white/50 px-6 py-4 text-[14px] font-bold text-[#5d4662] backdrop-blur-md transition-all hover:bg-white/80"
          >
            Sign In
          </button>
        </div>

        <div className="fade-up fade-up-3 mt-10 flex items-center justify-center gap-2.5 text-[10px] font-bold uppercase tracking-widest text-[#a895a5]">
          <ShieldCheck className="h-3.5 w-3.5" /> Privacy first. Always.
        </div>
      </div>
    </div>
  );
}

`;
  content = content.substring(0, startIdx) + replacementStr + content.substring(endIdx);
  fs.writeFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', content);
} else {
  console.log("Could not find start or end index");
}

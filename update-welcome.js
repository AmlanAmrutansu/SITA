const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');

const targetStr = `export function WelcomePage() {
  const [, setLocation] = useLocation();
  const { signedIn } = useSitaStore();

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#faf7f9] px-5 py-10">
      <div className="absolute -left-20 top-10 h-[28rem] w-[28rem] rounded-full bg-[#fce8ef] opacity-60 blur-[100px]" />
      <div className="absolute -right-24 bottom-10 h-[30rem] w-[30rem] rounded-full bg-[#ebe4f5] opacity-60 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[440px] text-center">
        <div className="mx-auto mb-10 flex justify-center fade-up"><SitaLogo /></div>
        <div className="relative mx-auto mb-10 max-w-[340px] overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/40 p-5 shadow-[0_8px_32px_rgba(152,126,145,0.08)] backdrop-blur-2xl fade-up fade-up-1">
          <WellnessIllustration />
          <div className="absolute left-7 top-7 rounded-full border border-white/50 bg-white/80 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[#9f6a80] shadow-sm backdrop-blur-md">
            A quiet place to begin
          </div>
        </div>
        <div className="fade-up fade-up-2">
          <p className="mb-3 font-display text-[3.5rem] leading-none tracking-tight text-[#4c3850]">SITA</p>
          <p className="mx-auto max-w-[270px] text-[12px] font-bold uppercase leading-relaxed tracking-[0.15em] text-[#9b8599]">
            Smart Intelligence for<br />Treatment &amp; Awareness
          </p>
          <p className="mx-auto mt-6 max-w-[300px] text-[13px] leading-relaxed text-[#7a6575]">
            A private health space made for understanding your cycle, mood, and reproductive wellness.
          </p>
        </div>
        <button
          onClick={() => setLocation(signedIn ? '/' : '/auth')}
          className="fade-up fade-up-2 mt-10 flex w-full items-center justify-center gap-3 rounded-full bg-[#5d4662] px-5 py-4 text-[13px] font-bold text-white shadow-[0_12px_24px_rgba(93,70,98,.25)] transition-all hover:-translate-y-1 hover:bg-[#4a364e]"
          data-testid="button-get-started"
        >
          {signedIn ? 'Open my SITA space' : 'Begin your journey'} <ArrowRight className="h-4 w-4" />
        </button>
        <div className="fade-up fade-up-2 mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-[#a895a5]">
          <Sparkles className="h-3 w-3" /> Privacy first. Always.
        </div>
      </div>
    </div>
  );
}`;

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
            onClick={() => setLocation('/auth?mode=signin')}
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
}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', content);

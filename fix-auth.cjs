const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ ==========================================\n\/\/ 2\. AUTH PAGE\n\/\/ ==========================================\nexport function AuthPage\(\) \{[\s\S]*?\}\n\n\/\/ ==========================================/;

const replacement = `// ==========================================
// 2. AUTH PAGE
// ==========================================
export function AuthPage() {
  const [, setLocation] = useLocation();
  const search = new URLSearchParams(window.location.search);
  const initialMode = search.get('mode') === 'signup' ? 'signup' : 'signin';
  const [signup, setSignup] = useState(initialMode === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [oauthError, setOauthError] = useState(false);
  const { refreshAll } = useSitaStore();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOauthError(false);
    
    if (signup && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setBusy(true);
    try {
      if (signup) {
        await api.signup(email, password, name || 'Friend');
      } else {
        await api.login(email, password);
      }
      if (refreshAll) {
        await refreshAll();
      }
      setLocation('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to continue.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#faf7f9] px-5 py-8">
      <div className="absolute -left-20 top-10 h-[28rem] w-[28rem] rounded-full bg-[#fce8ef] opacity-50 blur-[100px]" />
      <div className="absolute -right-24 bottom-10 h-[30rem] w-[30rem] rounded-full bg-[#ebe4f5] opacity-50 blur-[120px]" />
      
      <div className="relative z-10 w-full max-w-md">
        <Link href="/welcome" className="mb-8 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#a895a5] transition-colors hover:text-[#5d4662]">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        
        <div className="mb-8">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[#b7829a]">Your private health space</p>
          <h1 className="font-display text-[2.5rem] leading-tight text-[#4d394e]">{signup ? 'Create your account' : 'Welcome back'}</h1>
          <p className="mt-3 text-[13px] leading-relaxed text-[#8d7587]">All your cycles, notes, and AI chats remain securely private to you.</p>
        </div>

        {oauthError && (
          <p className="mb-6 rounded-2xl bg-[#fff0f3] px-4 py-3 text-xs font-semibold text-[#b55778]">
            Google sign-in could not be completed. Please try with email/password.
          </p>
        )}

        <form onSubmit={submit} className="rounded-[2rem] border border-white/60 bg-white/50 p-7 shadow-[0_8px_32px_rgba(152,126,145,0.08)] backdrop-blur-2xl">
          {signup && (
            <label className="mb-5 block text-xs font-bold uppercase tracking-wider text-[#765f71]">
              Name / Display Name
              <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5 text-[13px] text-[#4d394e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none transition focus:border-[#b7829a] focus:ring-2 focus:ring-[#f7dce5]" placeholder="e.g. Maya" />
            </label>
          )}
          <label className="mb-5 block text-xs font-bold uppercase tracking-wider text-[#765f71]">
            Email address
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5 text-[13px] text-[#4d394e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none transition focus:border-[#b7829a] focus:ring-2 focus:ring-[#f7dce5]" placeholder="you@example.com" />
          </label>
          {signup && (
            <label className="mb-5 block text-xs font-bold uppercase tracking-wider text-[#765f71]">
              Confirm Password
              <input type="password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5 text-[13px] text-[#4d394e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none transition focus:border-[#b7829a] focus:ring-2 focus:ring-[#f7dce5]" placeholder="Must match password" />
            </label>
          )}
          <label className="block text-xs font-bold uppercase tracking-wider text-[#765f71]">
            Password
            <input type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5 text-[13px] text-[#4d394e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none transition focus:border-[#b7829a] focus:ring-2 focus:ring-[#f7dce5]" placeholder="At least 6 characters" />
          </label>
          
          {!signup && (
             <div className="mt-3 flex justify-end">
               <button type="button" className="text-[11px] font-bold text-[#b7829a] hover:text-[#5d4662]" onClick={async () => {
    if (!email) {
      setError('Please enter your email first to reset password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // @ts-ignore
      if (api.resetPassword) await api.resetPassword(email);
      setError('Password reset instructions have been sent to your email.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reset password.');
    } finally {
      setBusy(false);
    }
  }}>Forgot password?</button>
             </div>
          )}
          {error && <p className="mt-5 rounded-2xl bg-[#fff0f3] px-4 py-3 text-xs font-semibold text-[#b55778]">{error}</p>}
          
          <button disabled={busy} className="mt-7 w-full rounded-full bg-[#5d4662] px-5 py-4 text-[13px] font-bold text-white shadow-[0_8px_16px_rgba(93,70,98,.2)] transition-all hover:-translate-y-0.5 hover:bg-[#4a364e] disabled:opacity-60">
            {busy ? 'One moment…' : signup ? 'Create account' : 'Sign in'}
          </button>
          
        </form>
        
        <button
          onClick={() => { setSignup(!signup); setError(''); }}
          className="mt-8 w-full text-center text-[11px] font-bold uppercase tracking-widest text-[#9b7187] hover:text-[#5d4662]"
        >
          {signup ? 'Already have an account? Sign in' : 'New to SITA? Create an account'}
        </button>
      </div>
    </div>
  );
}

// ==========================================`

code = code.replace(regex, replacement);

fs.writeFileSync(path, code);

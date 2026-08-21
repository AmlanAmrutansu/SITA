const fs = require('fs');

let content = fs.readFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');

// Remove Continue with Google
content = content.replace(
  /          <div className="my-6 flex items-center gap-4 text-\[10px\] font-bold uppercase tracking-widest text-\[#b09aa7\]">[\s\S]*?Continue with Google[\s\S]*?<\/button>/g,
  ''
);

// Add password confirm field for signup
content = content.replace(
  '          <label className="block text-xs font-bold uppercase tracking-wider text-[#765f71]">',
  `          {signup && (
            <label className="mb-5 block text-xs font-bold uppercase tracking-wider text-[#765f71]">
              Confirm Password
              <input type="password" minLength={6} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5 text-[13px] text-[#4d394e] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] outline-none transition focus:border-[#b7829a] focus:ring-2 focus:ring-[#f7dce5]" placeholder="Must match password" />
            </label>
          )}
          <label className="block text-xs font-bold uppercase tracking-wider text-[#765f71]">`
);

// Update AuthPage state
content = content.replace(
  '  const [password, setPassword] = useState(\'\');',
  `  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');`
);

// Add password check logic
content = content.replace(
  '    setBusy(true);\n    setError(\'\');',
  `    setBusy(true);
    setError('');
    if (signup && password !== confirmPassword) {
      setError('Passwords do not match.');
      setBusy(false);
      return;
    }`
);

// Add reset password method
content = content.replace(
  `onClick={() => alert('Password reset instructions will be sent to your email. (Feature active via API)')}`,
  `onClick={async () => {
    if (!email) {
      setError('Please enter your email first to reset password.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.resetPassword(email);
      setError('Password reset instructions have been sent to your email.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to reset password.');
    } finally {
      setBusy(false);
    }
  }}`
);

fs.writeFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', content);


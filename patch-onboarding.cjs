const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

const newOnboarding = `export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { mode, setMode, updateProfile, updatePregnancyData, updatePostpartumData, profile } = useSitaStore();

  // Account / General
  const [name, setName] = useState(profile?.display_name || '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth || '');
  const [healthNotes, setHealthNotes] = useState(profile?.health_notes || '');

  // Cycle Mode
  const [cycleLength, setCycleLength] = useState(String(profile?.typical_cycle_length || 28));
  const [periodLength, setPeriodLength] = useState(String(profile?.typical_period_length || 5));
  const [lastPeriod, setLastPeriod] = useState(profile?.last_period_date || '');

  // Pregnancy Mode
  const [dueDate, setDueDate] = useState('');
  const [pregnancyStartDate, setPregnancyStartDate] = useState('');

  // Postpartum Mode
  const [birthDate, setBirthDate] = useState('');
  const [bleedingLevel, setBleedingLevel] = useState('light');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (!name.trim()) throw new Error("Please enter your name or nickname.");
      
      await updateProfile({
        display_name: name.trim(),
        date_of_birth: dateOfBirth || null,
        reproductive_mode: mode,
        typical_cycle_length: mode === 'not-pregnant' ? Number(cycleLength) : null,
        typical_period_length: mode === 'not-pregnant' ? Number(periodLength) : null,
        last_period_date: mode === 'not-pregnant' ? (lastPeriod || null) : null,
        health_notes: healthNotes.trim() || null,
        onboarding_complete: true,
      });

      if (mode === 'pregnant') {
        if (!dueDate) throw new Error("Please provide your estimated due date.");
        await updatePregnancyData({
          due_date: dueDate || undefined,
          pregnancy_start_date: pregnancyStartDate || undefined,
        });
      } else if (mode === 'postpartum') {
        if (!birthDate) throw new Error("Please provide your childbirth date.");
        await updatePostpartumData({
          birth_date: birthDate || undefined,
          bleeding_level: bleedingLevel as any,
        });
      }

      setLocation(mode === 'pregnant' ? '/pregnancy' : mode === 'postpartum' ? '/postpartum' : '/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#fffafa] px-5 py-12 sm:grid sm:place-items-center">
      <form onSubmit={submit} className="mx-auto w-full max-w-2xl">
        <div className="text-center sm:text-left">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#b7829a]">A little context helps</p>
          <h1 className="font-display text-4xl text-[#4d394e]">Personalize your SITA</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#8d7587]">Only share what feels useful. You can change these details anytime in your Profile settings.</p>
        </div>

        <div className="mt-8 space-y-8 rounded-[32px] border border-[#f0e0e8] bg-white p-8 shadow-[0_18px_50px_rgba(89,55,76,.08)] sm:p-10">
          
          {/* Section: Personal Information */}
          <section className="space-y-5">
            <h2 className="text-sm font-bold tracking-wide text-[#765f71] uppercase border-b border-[#f0e0e8] pb-2">Personal Information</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block text-sm font-bold text-[#765f71]">
                Your Name / Nickname <span className="text-[#e889a6]">*</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maya" className="sita-input mt-2 w-full text-base" />
              </label>
              <label className="block text-sm font-bold text-[#765f71]">
                Date of Birth <span className="font-normal text-[#b09aa7]">(optional)</span>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="sita-input mt-2 w-full text-base" />
              </label>
            </div>
          </section>

          {/* Section: Reproductive Stage */}
          <section className="space-y-5">
            <h2 className="text-sm font-bold tracking-wide text-[#765f71] uppercase border-b border-[#f0e0e8] pb-2">Reproductive Stage</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['not-pregnant', 'pregnant', 'postpartum'] as ReproductiveMode[]).map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setMode(item)}
                  className={\`rounded-2xl border px-4 py-4 text-sm font-bold transition \${mode === item ? 'border-[#e889a6] bg-[#fff0f4] text-[#b55778] shadow-sm' : 'border-[#eee2e8] text-[#927e8d] hover:bg-[#faf6f8]'}\`}
                >
                  {modeDetails[item].title}
                </button>
              ))}
            </div>
          </section>

          {/* Section: Dynamic Stage Information */}
          <section>
            {mode === 'not-pregnant' && (
              <div className="rounded-[24px] bg-[#faf6f8] p-6 space-y-5 border border-[#eee2e8]">
                <h3 className="text-sm font-bold text-[#765f71]">Cycle Information</h3>
                <div className="grid gap-6 sm:grid-cols-3">
                  <label className="block text-sm font-bold text-[#765f71]">
                    Cycle length (days)
                    <input type="number" min="15" max="60" required value={cycleLength} onChange={(e) => setCycleLength(e.target.value)} className="sita-input mt-2 w-full text-base" />
                  </label>
                  <label className="block text-sm font-bold text-[#765f71]">
                    Period length (days)
                    <input type="number" min="1" max="15" required value={periodLength} onChange={(e) => setPeriodLength(e.target.value)} className="sita-input mt-2 w-full text-base" />
                  </label>
                  <label className="block text-sm font-bold text-[#765f71]">
                    Last period start
                    <input type="date" required value={lastPeriod} onChange={(e) => setLastPeriod(e.target.value)} className="sita-input mt-2 w-full text-base" />
                  </label>
                </div>
              </div>
            )}

            {mode === 'pregnant' && (
              <div className="rounded-[24px] bg-[#f4f2f9] p-6 space-y-5 border border-[#e6e2f1]">
                <h3 className="text-sm font-bold text-[#6b5887]">Pregnancy Information</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-[#6b5887]">
                    Estimated Due Date <span className="text-[#b55778]">*</span>
                    <input type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sita-input mt-2 w-full text-base border-[#e6e2f1]" />
                  </label>
                  <label className="block text-sm font-bold text-[#6b5887]">
                    Last Menstrual Period <span className="font-normal opacity-70">(optional)</span>
                    <input type="date" value={pregnancyStartDate} onChange={(e) => setPregnancyStartDate(e.target.value)} className="sita-input mt-2 w-full text-base border-[#e6e2f1]" />
                  </label>
                </div>
              </div>
            )}

            {mode === 'postpartum' && (
              <div className="rounded-[24px] bg-[#edf6ef] p-6 space-y-5 border border-[#d8eadc]">
                <h3 className="text-sm font-bold text-[#5c8a66]">Postpartum Information</h3>
                <div className="grid gap-6 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-[#5c8a66]">
                    Childbirth Date <span className="text-[#b55778]">*</span>
                    <input type="date" required value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="sita-input mt-2 w-full text-base border-[#d8eadc]" />
                  </label>
                  <label className="block text-sm font-bold text-[#5c8a66]">
                    Current Bleeding Level
                    <select value={bleedingLevel} onChange={(e) => setBleedingLevel(e.target.value)} className="sita-input mt-2 w-full text-base border-[#d8eadc] bg-white">
                      <option value="none">None</option>
                      <option value="light">Light</option>
                      <option value="normal">Normal</option>
                      <option value="heavy">Heavy</option>
                    </select>
                  </label>
                </div>
              </div>
            )}
          </section>

          {/* Section: Additional Notes */}
          <section className="space-y-3">
            <label className="block text-sm font-bold text-[#765f71]">
              Anything relevant for SITA to know? <span className="font-normal text-[#b09aa7]">(optional)</span>
              <textarea
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                className="sita-input mt-2 w-full min-h-[100px] text-base resize-none"
                placeholder="e.g. Trying to conceive, PCOS awareness, irregular cycles, general health goals..."
              />
            </label>
          </section>

          {error && (
            <div className="rounded-2xl bg-[#fff0f3] p-4 border border-[#fce8ef]">
              <p className="text-sm font-semibold text-[#b55778]">{error}</p>
            </div>
          )}

          <div className="pt-2">
            <button disabled={busy} className="w-full rounded-[20px] bg-[#e9779d] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#e9779d]/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:bg-[#e26a93] disabled:opacity-60 disabled:hover:translate-y-0">
              {busy ? 'Saving your health profile…' : 'Complete Setup & Enter SITA'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}`;

code = code.replace(/export function OnboardingPage\(\) \{[\s\S]*?\/\/\s*==========================================\n\/\/\s*2\.\s*REPRODUCTIVE HEALTH MODE SELECTION/m, `${newOnboarding}\n\n// ==========================================\n// 2. REPRODUCTIVE HEALTH MODE SELECTION`);
fs.writeFileSync(path, code);

import { useState, useMemo, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent, MouseEvent } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Baby,
  BarChart3,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  Clock,
  Download,
  Droplets,
  Flame,
  Flower2,
  HeartPulse,
  Info,
  Leaf,
  LockKeyhole,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Sun,
  Thermometer,
  Trash2,
  UserCheck,
  Utensils,
  Wind,
  X,
  Paperclip,
  FilePlus,
  FileText,
} from 'lucide-react';
import { AppShell, SitaLogo, OriginalSitaMark } from '@/components/AppShell';
import { SitaAvatar, WellnessIllustration } from '@/components/Illustration';
import { SitaChatInterface } from '@/components/SitaChatInterface';
import { moods, modeDetails, type MoodEntry, type ReproductiveMode, type Mood } from '@/data/mock';
import { useSitaStore, type CycleLogItem } from '@/data/store';
import { api, type PCOSScreeningInput, type SymptomTriageInput } from '@/lib/api';
import { analyzeHealthPatterns } from '@/lib/pattern-radar';
import { calculateCycleSummary, calculatePregnancyStats, calculatePostpartumStats, formatDate } from '@/lib/cycle';

function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-[#b7829a]">{eyebrow}</p>}
        <h1 className="font-display text-[2.15rem] leading-[1.05] tracking-[-.045em] text-[#4d3851] sm:text-[2.55rem]">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function Card({ children, className = '', testid }: { children: ReactNode; className?: string; testid?: string }) {
  return (
    <section className={`rounded-[2rem] border border-white/60 bg-white/50 p-6 shadow-[0_8px_32px_rgba(152,126,145,0.06)] backdrop-blur-xl transition-all ${className}`} data-testid={testid}>
      {children}
    </section>
  );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3c2a3b]/40 p-4 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-[#f0e2e8] bg-[#fffafb] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between border-b border-[#f1e6ec] pb-3">
          <h2 className="font-display text-2xl text-[#523c52]">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-[#f6ebf1] p-2 text-[#8c7083] hover:bg-[#edd8e4]" aria-label="Close dialog">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ==========================================
// 1. WELCOME PAGE
// ==========================================
export { WelcomePage } from './welcome-page';

// ==========================================
// 2. AUTH PAGE
// ==========================================
export function AuthPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const search = new URLSearchParams(searchString);
  const modeParam = search.get('mode');
  const [signup, setSignup] = useState(modeParam === 'signup');

  useEffect(() => {
    setSignup(modeParam === 'signup');
  }, [modeParam]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [oauthError, setOauthError] = useState(false);
  const { refreshAll } = useSitaStore();

  async function submit(e: FormEvent) {
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

// ==========================================
// ONBOARDING PAGE
// ==========================================

// ==========================================
// 1. ONBOARDING & PERSONALIZATION (MULTI-STEP GUIDED FLOW)
// ==========================================

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { mode, setMode, updateProfile, updatePregnancyData, updatePostpartumData, profile } = useSitaStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

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

  const handleNextFromStep1 = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name or nickname to continue.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    setError('');
    setStep(3);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (!name.trim()) throw new Error('Please enter your name or nickname.');

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
        if (!dueDate) throw new Error('Please provide your estimated due date.');
        await updatePregnancyData({
          due_date: dueDate || undefined,
          pregnancy_start_date: pregnancyStartDate || undefined,
        });
      } else if (mode === 'postpartum') {
        if (!birthDate) throw new Error('Please provide your childbirth date.');
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

  const stageOptions = [
    {
      id: 'not-pregnant' as const,
      icon: <Flower2 className="h-6 w-6" />,
      title: 'Cycle & Symptom Tracking',
      desc: 'Track menstrual cycles, predict fertile windows, understand hormonal phases, and monitor symptoms.',
      color: 'from-[#fff0f4] to-[#fdf4f7] border-[#e889a6] text-[#b55778]',
      badge: '🌸 Cycle Health',
    },
    {
      id: 'pregnant' as const,
      icon: <Baby className="h-6 w-6" />,
      title: 'Pregnancy Journey',
      desc: 'Track pregnancy milestones, prepare for prenatal appointments, and monitor kicks and symptoms.',
      color: 'from-[#f4f1fa] to-[#faf8fd] border-[#937bb8] text-[#785c9f]',
      badge: '🤰 Prenatal',
    },
    {
      id: 'postpartum' as const,
      icon: <HeartPulse className="h-6 w-6" />,
      title: 'Postpartum Recovery',
      desc: 'Monitor healing milestones, recovery bleeding (lochia), mood, sleep, and pelvic floor wellness.',
      color: 'from-[#edf6ef] to-[#f6faf7] border-[#78a982] text-[#558a60]',
      badge: '🌿 Postpartum',
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#fdf9fa] px-4 py-8 sm:py-12 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#f8e6ee] opacity-60 blur-3xl pointer-events-none" />
      <div className="absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-[#efe8f7] opacity-60 blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8e7ef] to-[#ebdcf2] shadow-sm mb-3">
            <OriginalSitaMark className="h-8 w-8" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#b7829a]">Welcome to SITA 🌸</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#4c364c]">
            Let’s personalize your health space
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#8a7285] max-w-md mx-auto leading-relaxed">
            This information helps SITA understand your health journey and tailor longitudinal guidance.
          </p>
        </div>

        {/* Multi-Step Progress Stepper */}
        <div className="mb-8 flex items-center justify-between rounded-2xl bg-white/75 p-3.5 border border-white/80 shadow-sm backdrop-blur-md">
          {[
            { num: 1, label: 'About You' },
            { num: 2, label: 'Health Stage' },
            { num: 3, label: 'Health Profile' },
          ].map((item, idx) => {
            const isActive = step === item.num;
            const isDone = step > item.num;
            return (
              <React.Fragment key={item.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition-all ${
                      isDone
                        ? 'bg-[#5e9968] text-white shadow-sm'
                        : isActive
                        ? 'bg-[#d65f8a] text-white shadow-sm ring-4 ring-[#fce8f0]'
                        : 'bg-[#f0e4ea] text-[#9a8594]'
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : item.num}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-semibold ${
                      isActive ? 'text-[#4c3548] font-bold' : isDone ? 'text-[#628b6a]' : 'text-[#a18e9d]'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {idx < 2 && <div className="h-px flex-1 mx-2 bg-[#ebdbe4]" />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card Container */}
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 sm:p-10 shadow-[0_16px_40px_rgba(152,126,145,0.08)] backdrop-blur-xl transition-all">
          
          {/* STEP 1: ABOUT YOU */}
          {step === 1 && (
            <form onSubmit={handleNextFromStep1} className="space-y-6 animate-in fade-in duration-300">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#b27997]">Step 1 of 3</span>
                <h2 className="font-display text-2xl font-bold text-[#4c3549] mt-0.5">Tell us about yourself</h2>
                <p className="text-xs text-[#8c7587] mt-1">SITA uses this to personalize conversations and recommendations.</p>
              </div>

              <div className="space-y-5 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6b5266]">
                    Your Name or Nickname <span className="text-[#d85880]">*</span>
                  </label>
                  <p className="text-[11px] text-[#9b8595]">How should SITA address you in chats and daily check-ins?</p>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maya"
                    className="sita-input w-full text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6b5266]">
                    Date of Birth <span className="text-[#9e8898] font-normal lowercase">(optional)</span>
                  </label>
                  <p className="text-[11px] text-[#9b8595]">Helps tailor stage-appropriate hormonal and clinical insights.</p>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="sita-input w-full text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-[#fff0f3] p-3.5 border border-[#fce8ef] text-xs font-semibold text-[#b55778]">
                  {error}
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-[#d75f8a] to-[#bf4a74] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(215,95,138,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Continue to Stage Selection</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REPRODUCTIVE STAGE */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#b27997]">Step 2 of 3</span>
                <h2 className="font-display text-2xl font-bold text-[#4c3549] mt-0.5">Choose your primary health stage</h2>
                <p className="text-xs text-[#8c7587] mt-1">We will customize your dashboard, cycle predictions, and SITA AI reasoning.</p>
              </div>

              <div className="space-y-3.5 pt-2">
                {stageOptions.map((item) => {
                  const isSelected = mode === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setMode(item.id)}
                      className={`w-full flex items-start gap-4 p-5 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? `bg-gradient-to-br ${item.color} shadow-[0_8px_24px_rgba(189,102,134,0.12)] ring-2 ring-offset-1 ring-[#e889a6]`
                          : 'border-[#eee0e7] bg-white/70 hover:bg-white hover:border-[#e3bccb]'
                      }`}
                    >
                      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <strong className="block text-sm font-bold text-[#4f374c]">{item.title}</strong>
                          <span className={`grid h-5 w-5 place-items-center rounded-full border ${isSelected ? 'bg-[#d65f8a] border-[#d65f8a] text-white' : 'border-[#dcccd6] text-transparent'}`}>
                            <Check className="h-3 w-3" />
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#866e80] leading-relaxed">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-2xl border border-[#ebd6e2] bg-white px-5 py-4 text-xs font-bold text-[#7a6074] hover:bg-[#faf4f8] transition"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep2}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#d75f8a] to-[#bf4a74] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(215,95,138,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Continue to Health Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: HEALTH PROFILE & DETAILS */}
          {step === 3 && (
            <form onSubmit={submit} className="space-y-6 animate-in fade-in duration-300">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#b27997]">Step 3 of 3</span>
                <h2 className="font-display text-2xl font-bold text-[#4c3549] mt-0.5">Health Profile &amp; Context</h2>
                <p className="text-xs text-[#8c7587] mt-1">Specific metrics tailored to your {modeDetails[mode].title.toLowerCase()} stage.</p>
              </div>

              {/* Dynamic Mode Form */}
              <div className="space-y-4 pt-1">
                {mode === 'not-pregnant' && (
                  <div className="rounded-2xl bg-[#faf4f8] p-5 border border-[#eee2eb] space-y-4">
                    <div className="flex items-center gap-2">
                      <Flower2 className="h-4 w-4 text-[#bf5c86]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#795d73]">Cycle Tracking Details</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6b5266]">
                          Typical Cycle Length (days)
                        </label>
                        <p className="text-[10px] text-[#9b8595]">Interval between periods (average is 28)</p>
                        <input
                          type="number"
                          min="15"
                          max="60"
                          required
                          value={cycleLength}
                          onChange={(e) => setCycleLength(e.target.value)}
                          className="sita-input w-full text-sm bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6b5266]">
                          Period Duration (days)
                        </label>
                        <p className="text-[10px] text-[#9b8595]">Days bleeding typically lasts (4–7)</p>
                        <input
                          type="number"
                          min="1"
                          max="15"
                          required
                          value={periodLength}
                          onChange={(e) => setPeriodLength(e.target.value)}
                          className="sita-input w-full text-sm bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-[#6b5266]">
                        Last Period Start Date
                      </label>
                      <p className="text-[10px] text-[#9b8595]">First day of your most recent period</p>
                      <input
                        type="date"
                        value={lastPeriod}
                        onChange={(e) => setLastPeriod(e.target.value)}
                        className="sita-input w-full text-sm bg-white"
                      />
                    </div>
                  </div>
                )}

                {mode === 'pregnant' && (
                  <div className="rounded-2xl bg-[#f4f1fa] p-5 border border-[#e5dfef] space-y-4">
                    <div className="flex items-center gap-2">
                      <Baby className="h-4 w-4 text-[#8565ad]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#69508b]">Pregnancy Information</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#69508b]">
                          Estimated Due Date <span className="text-[#d85880]">*</span>
                        </label>
                        <p className="text-[10px] text-[#9884b2]">From ultrasound or healthcare provider</p>
                        <input
                          type="date"
                          required
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="sita-input w-full text-sm bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#69508b]">
                          Last Menstrual Period <span className="text-[#9884b2] font-normal">(optional)</span>
                        </label>
                        <p className="text-[10px] text-[#9884b2]">Used to estimate gestational age</p>
                        <input
                          type="date"
                          value={pregnancyStartDate}
                          onChange={(e) => setPregnancyStartDate(e.target.value)}
                          className="sita-input w-full text-sm bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'postpartum' && (
                  <div className="rounded-2xl bg-[#edf6ef] p-5 border border-[#d8eadc] space-y-4">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="h-4 w-4 text-[#5c8a66]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#5c8a66]">Postpartum Details</h3>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#5c8a66]">
                          Childbirth Date <span className="text-[#d85880]">*</span>
                        </label>
                        <p className="text-[10px] text-[#86a88d]">Date your baby was born</p>
                        <input
                          type="date"
                          required
                          value={birthDate}
                          onChange={(e) => setBirthDate(e.target.value)}
                          className="sita-input w-full text-sm bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#5c8a66]">
                          Current Bleeding Stage
                        </label>
                        <p className="text-[10px] text-[#86a88d]">Postpartum lochia/recovery level</p>
                        <select
                          value={bleedingLevel}
                          onChange={(e) => setBleedingLevel(e.target.value)}
                          className="sita-input w-full text-sm bg-white"
                        >
                          <option value="none">None / Resolved</option>
                          <option value="light">Light</option>
                          <option value="normal">Normal / Moderate</option>
                          <option value="heavy">Heavy</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Health Notes */}
                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#6b5266]">
                    Anything relevant for SITA to know? <span className="text-[#9e8898] font-normal lowercase">(optional)</span>
                  </label>
                  <p className="text-[11px] text-[#9b8595]">e.g. Trying to conceive, PCOS awareness, irregular cycles, or general health goals.</p>
                  <textarea
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    rows={3}
                    className="sita-input w-full text-sm resize-none"
                    placeholder="Provide any health context you would like SITA to securely remember..."
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-2xl bg-[#fff0f3] p-3.5 border border-[#fce8ef] text-xs font-semibold text-[#b55778]">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-2xl border border-[#ebd6e2] bg-white px-5 py-4 text-xs font-bold text-[#7a6074] hover:bg-[#faf4f8] transition"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#d75f8a] to-[#bf4a74] px-6 py-4 text-sm font-bold text-white shadow-[0_8px_24px_rgba(215,95,138,0.25)] transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {busy ? 'Personalizing your health space…' : 'Complete Setup & Enter SITA 🌸'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. REPRODUCTIVE HEALTH MODE SELECTION
// ==========================================
export function ModePage() {
  const [, setLocation] = useLocation();
  const { mode, setMode } = useSitaStore();
  const choices: { id: ReproductiveMode; icon: ReactNode; tint: string }[] = [
    { id: 'not-pregnant', icon: <Flower2 className="h-6 w-6" />, tint: 'bg-[#fff0f4] text-[#c76687]' },
    { id: 'pregnant', icon: <Baby className="h-6 w-6" />, tint: 'bg-[#f1edfa] text-[#8871ae]' },
    { id: 'postpartum', icon: <HeartPulse className="h-6 w-6" />, tint: 'bg-[#edf6ef] text-[#6e9c77]' },
  ];

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#fdf8f8] px-5 py-10">
      <div className="absolute -right-24 top-12 h-72 w-72 rounded-full bg-[#ece3f5] opacity-60 blur-3xl" />
      <div className="relative w-full max-w-[590px] fade-up">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-xs font-bold text-[#907587]" data-testid="link-mode-back">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.2em] text-[#b7829a]">A little context helps</p>
          <h1 className="font-display text-4xl text-[#49364f] sm:text-5xl">What best describes your current stage?</h1>
          <p className="mt-3 text-xs leading-relaxed text-[#8f7788]">We’ll personalize SITA for you. You can change this anytime in settings.</p>
        </div>
        <div className="space-y-3.5">
          {choices.map((choice) => {
            const detail = modeDetails[choice.id];
            const selected = mode === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => setMode(choice.id)}
                className={`flex w-full items-center gap-4 rounded-[1.35rem] border p-5 text-left transition ${
                  selected
                    ? 'border-[#e889a6] bg-white shadow-[0_8px_24px_rgba(189,102,134,.12)]'
                    : 'border-[#f0e2e8] bg-white/75 hover:border-[#e7b6c7]'
                }`}
                data-testid={`button-mode-${choice.id}`}
              >
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${choice.tint}`}>{choice.icon}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm text-[#564254]">{detail.title}</strong>
                  <span className="mt-1 block text-xs leading-relaxed text-[#9a8491]">{detail.detail}</span>
                </span>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${selected ? 'border-[#e77d9f] bg-[#e77d9f] text-white' : 'border-[#ead9e2] text-transparent'}`}>
                  <Check className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setLocation(mode === 'pregnant' ? '/pregnancy' : mode === 'postpartum' ? '/postpartum' : '/')}
          className="mt-8 w-full rounded-full bg-[#e9779d] px-5 py-3.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(213,101,138,.2)] transition hover:-translate-y-0.5"
          data-testid="button-continue-mode"
        >
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 3. HOME DASHBOARD
// ==========================================
export function HomePage() {
  const { mode, periodDateStrings, moodEntries, profile, symptomLogs, addSymptom } = useSitaStore();
  const [, setLocation] = useLocation();
  const [symptomModalOpen, setSymptomModalOpen] = useState(false);
  const [symptomName, setSymptomName] = useState('');
  const [symptomSeverity, setSymptomSeverity] = useState<'mild' | 'moderate' | 'severe'>('mild');
  const [symptomSaved, setSymptomSaved] = useState(false);

  const displayName = profile?.name?.trim() || profile?.display_name?.trim() || 'there';
  const latestMood = moodEntries[0];
  const cycle = calculateCycleSummary(
    periodDateStrings,
    profile?.typical_cycle_length || 28,
    profile?.typical_period_length || 5
  );

  const handleAddSymptom = async (e: FormEvent) => {
    e.preventDefault();
    if (!symptomName.trim()) return;
    await addSymptom(symptomName.trim(), 'general', symptomSeverity);
    setSymptomSaved(true);
    setTimeout(() => {
      setSymptomSaved(false);
      setSymptomModalOpen(false);
      setSymptomName('');
    }, 1200);
  };

  // If in Pregnancy mode, render contextual Pregnancy Dashboard
  if (mode === 'pregnant') {
    return <PregnancyPage />;
  }

  // If in Postpartum mode, render contextual Postpartum Dashboard
  if (mode === 'postpartum') {
    return <PostpartumPage />;
  }

  const currentDateStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <AppShell>
      <PageTitle eyebrow={currentDateStr} title={`Hello, ${displayName} 🌸`}>
        <button
          onClick={() => setLocation('/mode')}
          className="hidden items-center gap-2 rounded-full border border-[#eddfe6] bg-white px-3.5 py-2 text-xs font-semibold text-[#876e81] sm:flex shadow-sm hover:bg-[#fff0f4]"
          data-testid="button-mode-summary"
        >
          <span className="h-2 w-2 rounded-full bg-[#8bae91]" />
          {modeDetails[mode].title}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_.75fr]">
        <div className="space-y-5">
          {/* Main Cycle Card matching reference design */}
          <Card className="relative overflow-hidden border-white/80 bg-gradient-to-br from-[#fcecf1]/90 to-[#fdf8fa]/90 p-7 shadow-[0_8px_32px_rgba(213,101,138,0.12)]" testid="card-cycle-phase">
            <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#f6dce5] opacity-60 blur-3xl" />
            <div className="absolute -left-12 -bottom-12 h-56 w-56 rounded-full bg-[#faebf0] opacity-60 blur-3xl" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#b25879]">
                {cycle.hasPeriodData ? `You’re in your ${cycle.phaseTitle}` : 'Cycle Tracking Ready'}
              </p>
              <p className="mt-3 font-display text-[3.5rem] leading-[1.1] text-[#50394e]">
                {cycle.hasPeriodData ? `Cycle Day ${cycle.currentDay}` : 'Welcome to SITA'}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#8b657b]">{cycle.phaseDescription}</p>

              <div className="mt-8 flex items-end justify-between border-t border-[#f4e2e8]/60 pt-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#a16f84]">Estimated next period</p>
                  <p className="mt-1.5 font-display text-[2rem] font-bold text-[#674657]">
                    {cycle.hasPeriodData ? (
                      <>
                        {cycle.nextPeriodIn} days <span className="text-sm font-normal text-[#8b657b]">({cycle.nextPeriodDateStr})</span>
                      </>
                    ) : (
                      <span className="text-base font-normal text-[#8b657b]">Tap Log Period below</span>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-[#a16f84]">
                    {cycle.hasPeriodData ? 'Based on your logged pattern' : 'Personalized to your rhythm'}
                  </p>
                </div>
                {/* Circular ring indicator */}
                <div className="relative grid h-16 w-16 place-items-center rounded-full border-[5px] border-[#dc7e9d] border-r-[#f5cad8] bg-white/60 text-center shadow-inner">
                  <div>
                    <strong className="block text-sm text-[#65455a]">
                      {cycle.hasPeriodData ? `Day ${cycle.currentDay}` : 'Ready'}
                    </strong>
                    <span className="text-[8px] text-[#a16f84]">
                      {cycle.hasPeriodData ? `of ${cycle.averageCycleLength}` : `${cycle.averageCycleLength}d`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 2-Column Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-[1.5rem] border border-white/60 bg-white/50 p-4.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md transition hover:bg-white/60" testid="card-mood-summary">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8d7787]">Mood</span>
                <Sun className="h-4 w-4 text-[#bd7895]" />
              </div>
              <p className="font-display text-2xl text-[#4b3850]">
                {latestMood?.mood ? `${latestMood.mood.charAt(0).toUpperCase() + latestMood.mood.slice(1)}` : 'Check in'}
              </p>
              <Link href="/mood" className="mt-3 inline-block text-[10px] font-bold text-[#bd7895] transition hover:text-[#9e5d79]">
                {latestMood ? 'View Details >' : 'Log Mood >'}
              </Link>
            </Card>

            <Card className="rounded-[1.5rem] border border-white/60 bg-white/50 p-4.5 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-md transition hover:bg-white/60" testid="card-next-period-summary">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#8d7787]">Next Period</span>
                <CalendarDays className="h-4 w-4 text-[#8b71af]" />
              </div>
              <p className="font-display text-2xl text-[#4b3850]">
                {cycle.hasPeriodData ? `${cycle.nextPeriodIn} days` : 'Log Period'}
              </p>
              <p className="text-[10px] font-semibold text-[#937b9d]">
                {cycle.hasPeriodData ? cycle.nextPeriodDateStr : 'Start tracking'}
              </p>
              <Link href="/cycle" className="mt-1 inline-block text-[10px] font-bold text-[#8b71af] transition hover:text-[#6a528e]">
                View Calendar &gt;
              </Link>
            </Card>
          </div>

          {/* Today's Insight Card */}
          <Card className="border border-white/60 bg-gradient-to-br from-[#f8f5fc]/90 to-[#fdfafb]/90 shadow-sm backdrop-blur-xl" testid="card-insight">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8c78aa]">Today’s insight</p>
                <p className="mt-3 max-w-[420px] font-display text-xl leading-snug text-[#584464]">
                  {cycle.hasPeriodData
                    ? `“You are currently in your ${cycle.phaseTitle}. Hormone levels support ${cycle.phase === 'Follicular' ? 'creativity and focused energy' : cycle.phase === 'Menstrual' ? 'gentle rest and restorative self-care' : cycle.phase === 'Ovulatory' ? 'confident communication and peak stamina' : 'steady grounding and nourishing meals' }.”`
                    : '“Welcome to SITA. Logging your daily energy, moods, and cycle milestones builds a deeply personalized picture of your hormonal wellness over time.”'}
                </p>
              </div>
              <div className="hidden h-14 w-14 place-items-center rounded-full bg-[#f1ebfa] text-[#8e7bb1] sm:grid shadow-[inset_0_2px_4px_rgba(255,255,255,0.8)]">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
            <Link href="/insights" className="mt-6 flex items-center gap-2 text-[11px] font-bold text-[#8064a2] transition hover:text-[#614b7e]" data-testid="link-view-insights">
              Explore your patterns <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>

        {/* Right Column: Quick Actions & SITA CTA */}
        <div className="space-y-5">
          <PatternRadarCard />
          <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-quick-actions">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-[1.4rem] text-[#553f54]">Quick actions</h2>
              <MoreHorizontal className="h-4 w-4 text-[#bca4b2]" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/cycle"
                className="flex min-h-[85px] items-center gap-3 rounded-[1.2rem] bg-white/60 p-3.5 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#c76b8b] shadow-[0_4px_12px_rgba(199,107,139,0.15)]">
                  <Droplets className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-[#553f54]">Log Period</span>
                  <span className="text-[10px] text-[#937b8f]">Track cycle day</span>
                </div>
              </Link>

              <Link
                href="/records"
                className="flex min-h-[85px] items-center gap-3 rounded-[1.2rem] bg-white/60 p-3.5 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#ba567a] shadow-[0_4px_12px_rgba(186,86,122,0.15)]">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-[#553f54]">Health Memory</span>
                  <span className="text-[10px] text-[#937b8f]">Meds &amp; Reports</span>
                </div>
              </Link>

              <Link
                href="/mood"
                className="flex min-h-[85px] items-center gap-3 rounded-[1.2rem] bg-white/60 p-3.5 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#ca9960] shadow-[0_4px_12px_rgba(202,153,96,0.15)]">
                  <Sun className="h-5 w-5" />
                </span>
                <div>
                  <span className="block text-xs font-bold text-[#553f54]">Log Mood</span>
                  <span className="text-[10px] text-[#937b8f]">Daily energy</span>
                </div>
              </Link>

              <button
                onClick={() => setSymptomModalOpen(true)}
                className="flex min-h-[85px] items-center gap-3 rounded-[1.2rem] bg-white/60 p-3.5 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#8871ac] shadow-[0_4px_12px_rgba(136,113,172,0.15)]">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="text-left">
                  <span className="block text-xs font-bold text-[#553f54]">Add Symptom</span>
                  <span className="text-[10px] text-[#937b8f]">Quick check-in</span>
                </div>
              </button>
            </div>

            {/* Purple SITA CTA Button matching image */}
            <Link
              href="/sita"
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#5d4662] py-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(93,70,98,.25)] transition hover:-translate-y-1 hover:bg-[#4a364e]"
            >
              <Sparkles className="h-4 w-4" /> Ask SITA AI
            </Link>
          </Card>

          {/* Soft Note Card */}
          <Card className="relative overflow-hidden border border-white/60 bg-gradient-to-br from-[#f1f8f2]/90 to-[#f9fbf9]/90 shadow-sm backdrop-blur-xl" testid="card-soft-note">
            <div className="relative z-10 max-w-[240px]">
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#75977d]">A note for today</p>
              <p className="mt-3 font-display text-[1.4rem] leading-tight text-[#496851]">
                Your body is giving you information, not a test to pass.
              </p>
            </div>
            <Leaf className="absolute -bottom-2 -right-2 h-28 w-28 rotate-[15deg] text-[#8fb69a]/20" strokeWidth={1} />
            <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-[#dcf2e1] opacity-50 blur-2xl" />
          </Card>
        </div>
      </div>

      {/* Quick Add Symptom Modal */}
      <Modal isOpen={symptomModalOpen} onClose={() => setSymptomModalOpen(false)} title="Record a Symptom">
        <form onSubmit={handleAddSymptom} className="space-y-4">
          <label className="block text-xs font-bold text-[#6f576a]">
            Symptom Name
            <input
              type="text"
              required
              value={symptomName}
              onChange={(e) => setSymptomName(e.target.value)}
              placeholder="e.g. Mild cramping, headache, bloating, fatigue..."
              className="sita-input mt-2"
            />
          </label>
          <div>
            <span className="block text-xs font-bold text-[#6f576a]">Severity</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['mild', 'moderate', 'severe'] as const).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSymptomSeverity(lvl)}
                  className={`rounded-xl border py-2 text-xs font-bold capitalize transition ${
                    symptomSeverity === lvl ? 'border-[#d27596] bg-[#fff0f4] text-[#b45677]' : 'border-[#eee3e8] text-[#8f798a]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#e9779d] py-3 text-xs font-bold text-white transition hover:-translate-y-0.5"
          >
            {symptomSaved ? <><Check className="h-4 w-4" /> Symptom Recorded</> : 'Save Symptom'}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}

// ==========================================
// 4. PERIOD & CYCLE TRACKER
// ==========================================
export function CyclePage() {
  const { periodDateStrings, togglePeriodDayString, logPeriodDetails, profile } = useSitaStore();
  const [currentDate, setCurrentDate] = useState(new Date()); // default August 2025 as in reference
  const [selectedDay, setSelectedDay] = useState(14);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [flow, setFlow] = useState<'light' | 'medium' | 'heavy' | 'spotting'>('medium');
  const [cramps, setCramps] = useState(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Cramps']);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const cycle = calculateCycleSummary(
    periodDateStrings,
    profile?.typical_cycle_length || 28,
    profile?.typical_period_length || 5,
    currentDate
  );

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthYearLabel = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  // Generate calendar days for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    while (days.length % 7 !== 0) days.push(null);

    const weeks: (number | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [currentDate]);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDateStr = (day: number) => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleToggleDay = (day: number) => {
    const dStr = getDateStr(day);
    setSelectedDay(day);
    togglePeriodDayString(dStr);
  };

  const handleSavePeriodDetails = async (e: FormEvent) => {
    e.preventDefault();
    const dStr = getDateStr(selectedDay);
    await logPeriodDetails(dStr, {
      flow,
      cramps,
      symptoms: selectedSymptoms,
    });
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      setLogModalOpen(false);
    }, 1200);
  };

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));
  };

  const selectedDateStr = getDateStr(selectedDay);
  const isSelectedPeriod = periodDateStrings.includes(selectedDateStr);

  const today = new Date();
  const todayFormatted = `Today • ${today.getDate()} ${monthNames[today.getMonth()].slice(0, 3)}`;

  return (
    <AppShell>
      <PageTitle eyebrow={monthYearLabel} title="Cycle Tracker">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/60 bg-white/50 text-[#a26f87] shadow-[0_2px_8px_rgba(162,111,135,0.12)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80"
          data-testid="button-cycle-calendar"
          aria-label="Jump to current month"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        {/* Calendar Card */}
        <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-cycle-calendar">
          <div className="mb-6 flex items-center justify-between">
            <button onClick={prevMonth} className="rounded-full bg-white/50 p-2 text-[#9b7b8e] shadow-sm backdrop-blur-md transition hover:bg-white/80" data-testid="button-previous-month" aria-label="Previous Month">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="font-display text-xl text-[#594354]" data-testid="text-current-month">{monthYearLabel}</h2>
            <button onClick={nextMonth} className="rounded-full bg-white/50 p-2 text-[#9b7b8e] shadow-sm backdrop-blur-md transition hover:bg-white/80" data-testid="button-next-month" aria-label="Next Month">
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-widest text-[#b39aa8]">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-y-3">
            {calendarData.flatMap((week, wi) =>
              week.map((day, di) => {
                if (day === null) return <span key={`${wi}-${di}`} className="h-10" />;
                const dStr = getDateStr(day);
                const isPeriod = periodDateStrings.includes(dStr);
                const isToday =
                  day === today.getDate() &&
                  currentDate.getMonth() === today.getMonth() &&
                  currentDate.getFullYear() === today.getFullYear();
                const isPredicted = cycle.hasPeriodData && cycle.predictedPeriodDates.includes(dStr);
                const isFertile = cycle.hasPeriodData && cycle.fertileWindowDates.includes(dStr);
                const isOvulation = cycle.hasPeriodData && cycle.ovulationDateStr === dStr;

                let badgeClass = 'text-[#715d6c] hover:bg-white/60';
                if (isPeriod) badgeClass = 'bg-gradient-to-br from-[#eb86a5] to-[#de678a] text-white shadow-md font-bold';
                else if (isPredicted) badgeClass = 'bg-[#e4d7f5]/70 text-[#715891] font-semibold backdrop-blur-sm';
                else if (isToday) badgeClass = 'border border-[#b19ad0] bg-white/80 text-[#836ba5] font-bold shadow-sm';
                else if (isFertile) badgeClass = 'bg-gradient-to-br from-[#fdf6fa] to-[#f7ebf2] text-[#936683] shadow-sm';

                return (
                  <button
                    key={day}
                    onClick={() => handleToggleDay(day)}
                    className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full text-xs transition hover:scale-105 ${badgeClass}`}
                    data-testid={`button-calendar-day-${day}`}
                  >
                    {day}
                    {isToday && <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-[#8c70b4]" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-4 border-t border-[#f2e6eb] pt-4 text-[10px] text-[#917b8b]">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#e981a1]" /> Period</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#e4d7f5]" /> Predicted Period</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#faf0f7] border border-[#d6a9c1]" /> Fertile Window</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#8c70b4]" /> Ovulation</span>
          </div>
        </Card>

        {/* Right Info Section matching image */}
        <div className="space-y-5">
          {/* Today Card */}
          <Card className="bg-[#fff0f4]" testid="card-today-cycle">
            <p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#b86d89]">{todayFormatted}</p>
            <p className="mt-2 font-display text-2xl text-[#553f50]">
              {cycle.hasPeriodData ? `Cycle Day ${cycle.currentDay}` : 'Ready to track'}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#a17b8c]">{cycle.phaseTitle}</p>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/80 p-3.5 shadow-xs">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5d8e3] text-[#c66586]">
                <Flower2 className="h-5 w-5" />
              </div>
              <p className="text-xs leading-relaxed text-[#876878]">
                {cycle.phaseDescription}
              </p>
            </div>
          </Card>

          {/* Log Today Action Tiles matching reference image */}
          <Card testid="card-log-today">
            <h2 className="font-display text-lg text-[#594354]">Log Today</h2>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <button
                onClick={() => setLogModalOpen(true)}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#fff0f4] p-3 text-[#c76587] transition hover:bg-[#fae2ea]"
              >
                <Droplets className="h-5 w-5" />
                <span className="text-[10px] font-bold">Flow</span>
              </button>
              <button
                onClick={() => setLogModalOpen(true)}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#fff4eb] p-3 text-[#c97854] transition hover:bg-[#fae6da]"
              >
                <Flame className="h-5 w-5" />
                <span className="text-[10px] font-bold">Cramps</span>
              </button>
              <button
                onClick={() => setLogModalOpen(true)}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#f3effa] p-3 text-[#876cae] transition hover:bg-[#eae3f5]"
              >
                <Sparkles className="h-5 w-5" />
                <span className="text-[10px] font-bold">Symptoms</span>
              </button>
              <Link
                href="/mood"
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-[#edf7ee] p-3 text-[#6c9c73] transition hover:bg-[#e1f1e3]"
              >
                <Smile className="h-5 w-5" />
                <span className="text-[10px] font-bold">Mood</span>
              </Link>
            </div>
          </Card>

          {/* Cycle Summary Card */}
          <Card className="border border-white/60 bg-gradient-to-br from-[#f8f5fc]/90 to-[#fdfafb]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-cycle-summary">
            <h2 className="font-display text-[1.4rem] text-[#553f54]">Cycle Summary</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#f2e6eb] pt-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8492]">Cycle Length</p>
                <p className="mt-1 font-display text-2xl text-[#665064]">{cycle.averageCycleLength} days</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#9a8492]">Period Length</p>
                <p className="mt-1 font-display text-2xl text-[#665064]">{cycle.periodLength} days</p>
              </div>
            </div>
          </Card>

          {/* Log Period Button */}
          <button
            onClick={() => handleToggleDay(selectedDay)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d65f8a] py-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(214,95,138,0.25)] transition hover:-translate-y-1 hover:bg-[#bd4e75]"
            data-testid="button-log-period"
          >
            {isSelectedPeriod ? 'Remove today’s period' : 'Log today’s period'} <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cycle Log Detail Modal */}
      <Modal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} title={`Log Details • ${selectedDay} Aug`}>
        <form onSubmit={handleSavePeriodDetails} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#6f576a]">Flow Intensity</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {(['spotting', 'light', 'medium', 'heavy'] as const).map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFlow(f)}
                  className={`rounded-xl border py-2.5 text-xs font-bold capitalize transition ${
                    flow === f ? 'border-[#e889a6] bg-[#fff0f4] text-[#b55778]' : 'border-[#eee2e8] text-[#8e7a89]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-[#6f576a]">
              <span>Cramp Intensity</span>
              <span className="text-[#b55778]">{cramps}/10</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              value={cramps}
              onChange={(e) => setCramps(Number(e.target.value))}
              className="mt-2 h-1.5 w-full cursor-pointer accent-[#e9779d]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#6f576a]">Common Symptoms</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Cramps', 'Headache', 'Bloating', 'Tender Breasts', 'Fatigue', 'Acne', 'Lower Back Ache', 'Mood Swings'].map((sym) => {
                const active = selectedSymptoms.includes(sym);
                return (
                  <button
                    type="button"
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active ? 'border-[#b19ad0] bg-[#f3effa] text-[#8165a6]' : 'border-[#eedee7] bg-white text-[#8c7889]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#e9779d] py-3.5 text-xs font-bold text-white transition hover:-translate-y-0.5"
          >
            {savedFeedback ? <><Check className="inline h-4 w-4" /> Saved</> : 'Save Entry'}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}

// ==========================================
// 5. MOOD TRACKER
// ==========================================
export function MoodPage() {
  const { addMood } = useSitaStore();
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<Mood>('Good');
  const [stress, setStress] = useState(3);
  const [energy, setEnergy] = useState(7);
  const [sleepHours, setSleepHours] = useState('7');
  const [sleepMinutes, setSleepMinutes] = useState('20');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const sleepStr = `${sleepHours}h ${sleepMinutes}m`;
    await addMood({
      mood: selected,
      stress,
      energy,
      sleep: sleepStr,
      note: note.trim() || undefined,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setLocation('/insights');
    }, 1200);
  };

  const moodOptions: { label: Mood; emoji: string; color: string }[] = [
    { label: 'Very happy', emoji: '😄', color: '#ffb347' },
    { label: 'Good', emoji: '😊', color: '#ffcc00' },
    { label: 'Okay', emoji: '😐', color: '#e6c229' },
    { label: 'Low', emoji: '😔', color: '#8892b0' },
    { label: 'Stressed', emoji: '😣', color: '#ff6b6b' },
  ];

  return (
    <AppShell>
      <PageTitle eyebrow="A gentle check-in" title="How are you feeling today?">
        <Link
          href="/insights"
          className="flex items-center gap-2 rounded-full border border-[#ecdfe6] bg-white px-4 py-2 text-xs font-bold text-[#8b7081] shadow-xs hover:bg-[#fff0f4]"
          data-testid="link-mood-history"
        >
          <BarChart3 className="h-4 w-4 text-[#b57ba0]" /> Mood Insights
        </Link>
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1fr_.75fr]">
        <Card className="border border-white/60 bg-gradient-to-br from-[#fcf9fc]/90 to-[#fdfafc]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-mood-form">
          <p className="mb-4 text-xs font-semibold text-[#8d7787]">Choose your current mood</p>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {moodOptions.map((mood) => {
              const active = selected === mood.label;
              return (
                <button
                  key={mood.label}
                  onClick={() => setSelected(mood.label)}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition ${
                    active ? 'bg-white/80 ring-2 ring-[#e982a1] shadow-sm scale-105 border border-white/60' : 'bg-white/40 hover:bg-white/60 shadow-sm backdrop-blur-sm border border-white/40'
                  }`}
                  data-testid={`button-mood-${mood.label.toLowerCase().replace(' ', '-')}`}
                >
                  <span className="text-3xl sm:text-4xl">{mood.emoji}</span>
                  <span className="text-[10px] font-semibold text-[#806a79]">{mood.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stress Level Slider */}
          <div className="mt-7">
            <div className="mb-2 flex justify-between text-xs font-semibold text-[#8d7787]">
              <span>Stress Level</span>
              <span className="font-normal text-[#b09aa6]">Low <span className="mx-1">—</span> High</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#9a70b7]"
              data-testid="input-stress-level"
            />
            <div className="mt-1 flex justify-end text-[10px] text-[#a5909d]">{stress}/10</div>
          </div>

          {/* Energy Level Slider */}
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-xs font-semibold text-[#8d7787]">
              <span>Energy Level</span>
              <span className="font-normal text-[#b09aa6]">Low <span className="mx-1">—</span> High</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#e9779d]"
              data-testid="input-energy-level"
            />
            <div className="mt-1 flex justify-end text-[10px] text-[#a5909d]">{energy}/10</div>
          </div>

          {/* Sleep Quality */}
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#8d7787]">
              <span>Sleep Quality</span>
              <span className="flex items-center gap-1 text-[#8c74a9] font-bold">
                <Moon className="h-3.5 w-3.5" /> {sleepHours}h {sleepMinutes}m
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="24"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="sita-input w-24 text-center bg-white/60 border border-white/40 shadow-sm backdrop-blur-sm"
                placeholder="Hours"
              />
              <span className="text-xs text-[#8d7787]">hours</span>
              <input
                type="number"
                min="0"
                max="59"
                value={sleepMinutes}
                onChange={(e) => setSleepMinutes(e.target.value)}
                className="sita-input w-24 text-center bg-white/60 border border-white/40 shadow-sm backdrop-blur-sm"
                placeholder="Mins"
              />
              <span className="text-xs text-[#8d7787]">mins</span>
            </div>
          </div>

          {/* Optional Note */}
          <div className="mt-6">
            <label className="mb-2 block text-xs font-semibold text-[#8d7787]" htmlFor="mood-note">
              Add a note <span className="font-normal text-[#b5a1ad]">(optional)</span>
            </label>
            <textarea
              id="mood-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-20 w-full resize-none rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-sm p-3 text-xs text-[#665064] outline-none transition focus:border-white/80 focus:bg-white/60"
              placeholder="Anything you want to remember about today?"
              data-testid="input-mood-note"
            />
          </div>

          <button
            onClick={save}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#d65f8a] py-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(214,95,138,0.25)] transition hover:-translate-y-1 hover:bg-[#bd4e75]"
            data-testid="button-save-mood"
          >
            {saved ? <><Check className="h-4 w-4" /> Saved Entry</> : <>Save Entry <ArrowRight className="h-4 w-4" /></>}
          </button>
        </Card>

        {/* Right Context Cards */}
        <div className="space-y-5">
          <Card className="border border-[#e7e1f2]/60 bg-gradient-to-br from-[#f3eef9]/90 to-[#f9f5fd]/90 shadow-sm backdrop-blur-md" testid="card-mood-context">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/60 text-[#987cb6] shadow-sm backdrop-blur-sm border border-white/60">
                <BedDouble className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#9179ad]">Sleep Quality</p>
                <p className="mt-1 font-display text-[1.6rem] leading-tight text-[#594464]">{sleepHours}h {sleepMinutes}m</p>
              </div>
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-[#806f8f]">
              Your rest has been trending a little steadier this week. That is worth noticing.
            </p>
          </Card>

          <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-mood-prompt">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b17b96]">A soft prompt</p>
            <p className="mt-3 font-display text-[1.4rem] leading-snug text-[#573f50]">
              What would make the next hour feel 5% kinder?
            </p>
            <Wind className="mt-6 h-6 w-6 text-[#b68caa]/60" />
          </Card>
        </div>
      
      
    </div>
    </AppShell>
  );
}

// ==========================================
// 6. MOOD INSIGHTS
// ==========================================
export function InsightsPage() {
  const { moodEntries, deleteMood } = useSitaStore();
  const [metric, setMetric] = useState<'Mood' | 'Stress' | 'Energy' | 'Sleep'>('Mood');

  // Generate chart data from real user history
  const chartPoints = useMemo(() => {
    if (!moodEntries || moodEntries.length === 0) {
      return [];
    }

    const moodScoreMap: Record<string, number> = {
      'great': 10,
      'good': 8,
      'okay': 6,
      'low': 4,
      'anxious': 3,
      'rough': 2,
    };

    const sorted = [...moodEntries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10);

    return sorted.map((entry) => {
      const d = new Date(entry.date);
      const label = isNaN(d.getTime()) ? entry.date : `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
      let val = 5;
      if (metric === 'Stress') {
        val = entry.stress ?? 5;
      } else if (metric === 'Energy') {
        val = entry.energy ?? 5;
      } else if (metric === 'Sleep') {
        val = Math.min(10, Math.max(1, parseFloat(String(entry.sleep || 7))));
      } else {
        const mKey = (entry.mood || '').toLowerCase();
        val = moodScoreMap[mKey] ?? 6;
      }
      return { label, val };
    });
  }, [moodEntries, metric]);

  return (
    <AppShell>
      <PageTitle eyebrow="Your patterns, with care" title="Mood Insights" />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <Card className="border border-white/60 bg-gradient-to-br from-[#f8f5fc]/90 to-[#fdfafb]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-mood-chart">
          {/* Metric Selector Pills matching reference image */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/40 pb-4">
            <div>
              <h2 className="font-display text-[1.4rem] text-[#594354]">Your {metric.toLowerCase()} rhythm</h2>
              <p className="mt-0.5 text-[11px] text-[#a18a98]">Logged pattern overview</p>
            </div>
            <div className="flex gap-1 rounded-full bg-white/50 p-1 shadow-sm backdrop-blur-sm border border-white/60">
              {(['Mood', 'Stress', 'Energy', 'Sleep'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMetric(tab)}
                  className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
                    metric === tab ? 'bg-white text-[#8b6baa] shadow-[0_2px_4px_rgba(139,107,170,0.15)]' : 'text-[#b09daa] hover:text-[#7d5d9e]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Line / Bar Chart */}
          <div className="relative h-56 w-full overflow-hidden rounded-[1.2rem] bg-white/60 px-4 pt-6 flex flex-col justify-end shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] border border-white/40">
            <div className="absolute inset-x-4 top-10 border-t border-dashed border-[#eee2ef]" />
            <div className="absolute inset-x-4 top-24 border-t border-dashed border-[#eee2ef]" />
            <div className="absolute inset-x-4 top-38 border-t border-dashed border-[#eee2ef]" />

            {chartPoints.length > 0 ? (
              <div className="relative flex h-36 items-end justify-around px-3">
                {chartPoints.map((pt, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div
                      className="w-3.5 rounded-full bg-gradient-to-t from-[#e4d4ee] to-[#c7b5d1] transition-all hover:bg-[#e982a1] shadow-sm"
                      style={{ height: `${Math.max(8, pt.val * 11)}px` }}
                      title={`${pt.label}: ${pt.val}`}
                    />
                    <span className="text-[9px] font-semibold text-[#ad9aa8]">{pt.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="relative z-10 flex flex-col items-center justify-center pb-12 text-center">
                <Sun className="h-8 w-8 text-[#d8c2d3]" />
                <p className="mt-2 text-[13px] font-semibold text-[#7c6676]">No {metric.toLowerCase()} logs recorded yet</p>
                <Link
                  href="/mood"
                  className="mt-3 rounded-full bg-[#d65f8a] px-5 py-2 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(214,95,138,0.25)] hover:-translate-y-0.5 transition"
                >
                  Log today’s mood
                </Link>
              </div>
            )}
          </div>

          {/* AI Insight Card matching image */}
          <div className="mt-6 rounded-[1.2rem] bg-[#fff0f4]/80 p-5 border border-white/60 shadow-sm backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b8738e]">Pattern Insight</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6e586c]">
              {chartPoints.length >= 3
                ? `You have logged ${moodEntries.length} check-ins. Your ${metric.toLowerCase()} patterns show gentle fluctuations across your cycle phases. Keep logging to refine your hormonal correlations.`
                : 'Logging your mood, energy, and sleep daily allows SITA to generate individualized phase-correlated hormonal insights.'}
            </p>
          </div>
        </Card>

        {/* Right: Mood Records List */}
        <div className="space-y-5">
          <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-mood-records">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-[1.4rem] text-[#594354]">Mood Records</h2>
              <Link href="/mood" className="text-xs font-bold text-[#b86486]" data-testid="link-add-mood">
                Add <Plus className="ml-1 inline h-3 w-3" />
              </Link>
            </div>
            <div className="mt-5 space-y-2">
              {moodEntries.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-[1rem] bg-white/60 px-4 py-3 shadow-sm backdrop-blur-md border border-white/40"
                  data-testid={`row-mood-${entry.id}`}
                >
                  <span className="text-xs font-semibold text-[#967f8e]">{entry.date}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#7a5d97] shadow-sm">
                      {entry.mood}
                    </span>
                    <button
                      onClick={() => deleteMood(entry.id)}
                      className="rounded-full p-1.5 text-[#c2acbb] shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-[#d35f85]"
                      aria-label="Delete entry"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

// ==========================================
// 7. UNIFIED SITA AI ASSISTANT & CHAT
// ==========================================
export function SitaPage() {
  const searchString = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  
  const initialPrompt = searchParams.get('prompt') || undefined;
  const initialPcos = searchParams.get('pcos') === 'true';
  const initialTriage = searchParams.get('triage') === 'true';

  return (
    <AppShell>
      <div className="w-full flex-1 flex flex-col h-full min-h-0">
        <SitaChatInterface
          initialPrompt={initialPrompt}
          initialPcos={initialPcos}
          initialTriage={initialTriage}
        />
      </div>
    </AppShell>
  );
}

// ==========================================
// 8. PREGNANCY MODE
// ==========================================
export function PregnancyPage() {
  const { pregnancyData, recordKick, resetKicks, addAppointment } = useSitaStore();
  const [, setLocation] = useLocation();
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentDoctor, setAppointmentDoctor] = useState('Dr. Anita Rao');

  const stats = calculatePregnancyStats(pregnancyData.due_date, pregnancyData.pregnancy_start_date);

  const handleAddAppointment = async (e: FormEvent) => {
    e.preventDefault();
    if (!appointmentTitle.trim()) return;
    await addAppointment({
      title: appointmentTitle.trim(),
      date: appointmentDate,
      doctor: appointmentDoctor.trim(),
    });
    setAppointmentTitle('');
    setActiveModal(null);
  };

  return (
    <AppShell>
      <PageTitle eyebrow="A new chapter, gently held" title="Pregnancy Overview">
        <span className="rounded-full bg-[#f1ebfa] px-3.5 py-2 text-xs font-bold text-[#8973aa] shadow-xs">
          {stats.trimester}
        </span>
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-5">
          {/* Baby Size Card matching reference image */}
          <Card className="overflow-hidden border border-white/60 bg-gradient-to-br from-[#f2ecfa]/90 to-[#f9f5fd]/90 p-0 shadow-[0_8px_32px_rgba(213,101,138,0.06)] backdrop-blur-xl" testid="card-pregnancy-hero">
            <WellnessIllustration type="pregnancy" />
            <div className="relative p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#917aa9]">
                Week {stats.weeks} • Day {stats.days} 🌸
              </p>
              <p className="mt-2 font-display text-[2.2rem] leading-tight text-[#594365]">
                Baby is the size of a {stats.babySizeItem} {stats.babySizeEmoji}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#82718d]">
                Approx. {stats.babyLength} long and {stats.babyWeight}. Your body is working hard. Give it room for rest, hydration, and small moments of joy.
              </p>
            </div>
          </Card>

          {/* Tip Card */}
          <Card className="border border-white/60 bg-gradient-to-br from-[#eaf3eb]/90 to-[#f2f9f3]/90 shadow-sm backdrop-blur-md" testid="card-pregnancy-tip">
            <div className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/60 text-[#769b7d] shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#73967a]">Today’s Tip</p>
                <p className="mt-1.5 text-sm font-semibold leading-relaxed text-[#4f6d55]">
                  Stay hydrated and take short walks. Your body will thank you! 💖
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Care Toolkit matching 6 tiles in image */}
        <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-pregnancy-tools">
          <h2 className="font-display text-[1.4rem] text-[#594354]">Your Care Toolkit</h2>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              ['Timeline', CalendarDays, () => setActiveModal('Timeline')],
              ['Symptoms', Thermometer, () => setActiveModal('Symptoms')],
              ['Nutrition', Utensils, () => setActiveModal('Nutrition')],
              ['Kick Counter', Activity, () => setActiveModal('Kick Counter')],
              ['Appointments', NotebookPen, () => setActiveModal('Appointments')],
              ['AI Assistant', Sparkles, () => setLocation('/sita')],
            ].map(([label, Icon, action]: any) => (
              <button
                key={label}
                onClick={action}
                className="flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-white/60 p-3 text-[#816a98] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80"
                data-testid={`button-pregnancy-${label.toLowerCase().replace(' ', '-')}`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0e9f7] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-bold">{label}</span>
              </button>
            ))}
          </div>

          <p className="mt-6 rounded-2xl bg-[#fff5eb] p-4 text-[11px] leading-relaxed text-[#946f5e] shadow-sm">
            Every pregnancy is different. Please contact your healthcare professional with any symptoms or changes that feel unusual.
          </p>
        </Card>
      </div>

      {/* Kick Counter Modal */}
      <Modal isOpen={activeModal === 'Kick Counter'} onClose={() => setActiveModal(null)} title="Kick Counter">
        <div className="text-center space-y-4">
          <p className="text-xs text-[#806f8c]">
            Doctors generally recommend feeling at least 10 fetal movements within 2 hours during peak activity.
          </p>
          <div className="py-6">
            <p className="font-display text-6xl text-[#674b80]">{pregnancyData.kick_count || 0}</p>
            <p className="mt-1 text-xs text-[#9d88b0]">Kicks recorded today</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={recordKick}
              className="flex-1 rounded-full bg-[#8f75b4] py-3.5 text-xs font-bold text-white transition hover:-translate-y-0.5"
            >
              + Record Kick
            </button>
            <button
              onClick={resetKicks}
              className="rounded-full border border-[#eedde7] px-4 py-3.5 text-xs font-bold text-[#897384] hover:bg-[#fff0f4]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Appointments Modal */}
      <Modal isOpen={activeModal === 'Appointments'} onClose={() => setActiveModal(null)} title="Prenatal Appointments">
        <div className="space-y-4">
          <div className="space-y-2">
            {(pregnancyData.appointments || []).map((app) => (
              <div key={app.id} className="rounded-2xl border border-[#f0e2e8] bg-white p-3.5">
                <div className="flex justify-between">
                  <p className="text-xs font-bold text-[#5c445a]">{app.title}</p>
                  <span className="text-[10px] text-[#8e738c] font-semibold">{app.date}</span>
                </div>
                {app.doctor && <p className="mt-1 text-[10px] text-[#9c8496]">{app.doctor}</p>}
              </div>
            ))}
          </div>
          <form onSubmit={handleAddAppointment} className="border-t border-[#f1e6ec] pt-4 space-y-3">
            <p className="text-xs font-bold text-[#62475e]">Add an appointment</p>
            <input
              type="text"
              required
              value={appointmentTitle}
              onChange={(e) => setAppointmentTitle(e.target.value)}
              placeholder="e.g. 24-Week Glucose Check"
              className="sita-input"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="sita-input"
              />
              <input
                type="text"
                value={appointmentDoctor}
                onChange={(e) => setAppointmentDoctor(e.target.value)}
                placeholder="Doctor / Clinic"
                className="sita-input"
              />
            </div>
            <button type="submit" className="w-full rounded-full bg-[#8f75b4] py-3 text-xs font-bold text-white">
              Add Appointment
            </button>
          </form>
        </div>
      </Modal>

      {/* Nutrition Modal */}
      <Modal isOpen={activeModal === 'Nutrition'} onClose={() => setActiveModal(null)} title="Pregnancy Nutrition Guide">
        <div className="space-y-3 text-xs leading-relaxed text-[#6d576a]">
          <div className="rounded-2xl bg-[#edf7ee] p-3.5">
            <strong className="block text-[#476e4c]">Hydration &amp; Electrolytes</strong>
            Drink 8–10 glasses of water daily. Coconut water or lemon water helps maintain fluid balance.
          </div>
          <div className="rounded-2xl bg-[#fff2f5] p-3.5">
            <strong className="block text-[#a84e6f]">Iron &amp; Folate Rich Foods</strong>
            Lentils, leafy greens, fortified cereals, and lean proteins support expanding blood volume.
          </div>
          <div className="rounded-2xl bg-[#f4effa] p-3.5">
            <strong className="block text-[#7b5ea1]">Calcium &amp; Vitamin D</strong>
            Yogurt, pasteurized cheese, sesame seeds, and fortified plant milks help baby’s developing bone structure.
          </div>
        </div>
      </Modal>

      {/* Symptoms Modal */}
      <Modal isOpen={activeModal === 'Symptoms'} onClose={() => setActiveModal(null)} title="Pregnancy Symptoms">
        <div className="space-y-3">
          <p className="text-xs text-[#8c7488]">Common symptoms in the second trimester:</p>
          <div className="flex flex-wrap gap-2">
            {['Mild backache', 'Food cravings', 'Round ligament aches', 'Vivid dreams', 'Occasional heartburn', 'Nasal congestion'].map((s) => (
              <span key={s} className="rounded-full bg-[#f4effa] px-3.5 py-1.5 text-xs font-semibold text-[#745596]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </Modal>

      {/* Timeline Modal */}
      <Modal isOpen={activeModal === 'Timeline'} onClose={() => setActiveModal(null)} title="Pregnancy Timeline">
        <div className="space-y-3 text-xs text-[#6e586b]">
          <div className="border-l-2 border-[#8f75b4] pl-3">
            <strong>Weeks 1–13: 1st Trimester</strong>
            <p className="text-[11px] text-[#9b8599]">Embryonic development, major organs form, initial ultrasound.</p>
          </div>
          <div className="border-l-2 border-[#e9779d] pl-3 font-semibold text-[#8f476a]">
            <strong>Weeks 14–27: 2nd Trimester (Current)</strong>
            <p className="text-[11px] text-[#9b8599]">Quickening movements, anatomy scan, increased energy.</p>
          </div>
          <div className="border-l-2 border-[#d5cadf] pl-3">
            <strong>Weeks 28–40: 3rd Trimester</strong>
            <p className="text-[11px] text-[#9b8599]">Rapid growth, birth plan preparation, final checkups.</p>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

// ==========================================
// 9. POSTPARTUM MODE
// ==========================================
export function PostpartumPage() {
  const { postpartumData, updatePostpartumData, recordKegel, profile } = useSitaStore();
  const [selectedCheckin, setSelectedCheckin] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [kegelActive, setKegelActive] = useState(false);
  const [kegelPhase, setKegelPhase] = useState<'Squeeze' | 'Relax'>('Squeeze');

  const displayName = profile?.display_name || '';
  const stats = calculatePostpartumStats(postpartumData.birth_date);

  // Kegel animation timer loop
  useEffect(() => {
    if (!kegelActive) return;
    const interval = setInterval(() => {
      setKegelPhase((prev) => (prev === 'Squeeze' ? 'Relax' : 'Squeeze'));
      if (kegelPhase === 'Squeeze') {
        void recordKegel();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [kegelActive, kegelPhase, recordKegel]);

  const handleSaveCheckin = async () => {
    if (selectedCheckin === 'Bleeding') {
      await updatePostpartumData({ bleeding_level: 'light' });
    }
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
    }, 1800);
  };

  return (
    <AppShell>
      <PageTitle eyebrow="Recovery is not a straight line" title="Postpartum Care">
        <span className="rounded-full bg-[#edf6ef] px-3.5 py-2 text-xs font-bold text-[#73957a] shadow-xs">
          Week {stats.weeks}
        </span>
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-5">
          {/* Postpartum Hero Card matching reference image */}
          <Card className="overflow-hidden border border-white/60 bg-gradient-to-br from-[#f9e6eb]/90 to-[#fdf4f7]/90 p-0 shadow-[0_8px_32px_rgba(213,101,138,0.06)] backdrop-blur-xl" testid="card-postpartum-hero">
            <WellnessIllustration type="postpartum" />
            <div className="relative p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b3728b]">
                You’re doing amazing, {displayName}! 💖
              </p>
              <p className="mt-2 font-display text-[2.2rem] leading-tight text-[#594052]">Week {stats.weeks}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-[#886f7e]">
                {stats.stage}. {stats.advice}
              </p>
            </div>
          </Card>

          {/* Emergency Warning Card */}
          <Card className="border border-[#fcebe8]/60 bg-gradient-to-br from-[#fff5eb]/90 to-[#fffaf5]/90 shadow-sm backdrop-blur-md" testid="card-postpartum-note">
            <div className="flex gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/60 text-[#c67f78] shadow-sm">
                <HeartPulse className="h-5 w-5" />
              </span>
              <p className="text-[13px] font-semibold leading-relaxed text-[#795a5f]">
                If you have a high fever, severe headache, heavy bleeding soaking &gt;2 pads/hr, or feel unsafe, contact your healthcare professional right away.
              </p>
            </div>
          </Card>
        </div>

        {/* Right: Recovery Check-in & Helpful Tools */}
        <div className="space-y-5">
          <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-recovery-checkin">
            <h2 className="font-display text-[1.4rem] text-[#594354]">Track Your Recovery</h2>
            <p className="mt-1 text-xs text-[#a08b98]">A quick check-in for today</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['Bleeding', Droplets],
                ['Mood', Sun],
                ['Sleep', BedDouble],
                ['Activity', Activity],
              ].map(([label, Icon]: any) => {
                const isSelected = selectedCheckin === label;
                return (
                  <button
                    key={label}
                    onClick={() => setSelectedCheckin(label)}
                    className={`flex min-h-[93px] flex-col items-center justify-center gap-2 rounded-[1.2rem] transition shadow-sm backdrop-blur-sm ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#f9e2ea] to-[#fdf0f4] ring-2 ring-[#e3a0b5] text-[#9e7184]'
                        : 'bg-white/60 hover:bg-white/80 text-[#9e7184]'
                    }`}
                    data-testid={`button-recovery-${label.toLowerCase()}`}
                  >
                    <span className={`grid h-10 w-10 place-items-center rounded-xl shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] ${isSelected ? 'bg-white/80' : 'bg-[#f9e5ed]'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] font-bold">{label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSaveCheckin}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#d65f8a] py-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(214,95,138,0.25)] transition hover:-translate-y-1 hover:bg-[#bd4e75]"
              data-testid="button-save-recovery"
            >
              {savedFeedback ? <><Check className="h-4 w-4" /> Check-in saved</> : 'Save today’s check-in'}
            </button>
          </Card>

          {/* Helpful Tools Card matching reference image */}
          <Card className="border border-white/60 bg-white/40 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-postpartum-tools">
            <h2 className="font-display text-[1.4rem] text-[#594354]">Helpful Tools</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setActiveTool('Pelvic Floor')}
                className="flex flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-white/60 p-4 min-h-[96px] text-[#8666a4] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f6effb] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
                  <Activity className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-bold text-center">Pelvic Floor</span>
              </button>
              <button
                onClick={() => setActiveTool('Nutrition')}
                className="flex flex-col items-center justify-center gap-2 rounded-[1.2rem] bg-white/60 p-4 min-h-[96px] text-[#63936c] shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6ef] shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)]">
                  <Utensils className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-bold text-center">Nutrition</span>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Pelvic Floor Kegel Trainer Modal */}
      <Modal isOpen={activeTool === 'Pelvic Floor'} onClose={() => { setActiveTool(null); setKegelActive(false); }} title="Pelvic Floor Exercises">
        <div className="text-center space-y-4">
          <p className="text-xs text-[#806e8b]">
            Gentle diaphragmatic breathing and pelvic floor contractions encourage blood flow and tissue recovery.
          </p>
          <div className="py-6">
            <div className={`mx-auto grid h-28 w-28 place-items-center rounded-full transition-all duration-1000 ${
              kegelPhase === 'Squeeze' && kegelActive
                ? 'scale-110 bg-[#e8a3bc] text-white shadow-lg'
                : 'bg-[#f4e6ec] text-[#865972]'
            }`}>
              <strong className="text-lg">{kegelActive ? kegelPhase : 'Ready'}</strong>
            </div>
            <p className="mt-3 text-xs text-[#8c7489]">Total contractions logged: {postpartumData.kegel_count || 0}</p>
          </div>
          <button
            onClick={() => setKegelActive(!kegelActive)}
            className={`w-full rounded-full py-3 text-xs font-bold text-white transition ${
              kegelActive ? 'bg-[#c66286]' : 'bg-[#8f75b4]'
            }`}
          >
            {kegelActive ? 'Pause Exercise' : 'Start 3-Sec Breathing Loop'}
          </button>
        </div>
      </Modal>

      {/* Nutrition Modal */}
      <Modal isOpen={activeTool === 'Nutrition'} onClose={() => setActiveTool(null)} title="Postpartum Healing Nutrition">
        <div className="space-y-3 text-xs text-[#6e586c]">
          <div className="rounded-2xl bg-[#fff1f5] p-3.5">
            <strong className="block text-[#ad5477]">Warm &amp; Easy-to-Digest Meals</strong>
            Bone broths, vegetable stews, soft khichdi, and oatmeal replenish vital nutrients without burdening digestion.
          </div>
          <div className="rounded-2xl bg-[#edf6ef] p-3.5">
            <strong className="block text-[#52875c]">Tissue Healing &amp; Hydration</strong>
            Keep water, electrolyte infusions, and protein-rich snacks near your rest area.
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

// ==========================================
// 10. PROFILE & PRIVACY
// ==========================================
export function ProfilePage() {
  const {
    mode,
    setMode,
    privacy,
    setPrivacy,
    notifications,
    setNotifications,
    profile,
    updateProfile,
    signOut,
    exportData,
    purgeAccountData,
    signedIn,
  } = useSitaStore();

  const [, setLocation] = useLocation();
  const [saved, setSaved] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [name, setName] = useState(profile?.display_name || '');
  const [cycleSettingsOpen, setCycleSettingsOpen] = useState(false);
  const [cycleLength, setCycleLength] = useState(String(profile?.typical_cycle_length || 28));
  const [periodLength, setPeriodLength] = useState(String(profile?.typical_period_length || 5));
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);

  const displayName = profile?.display_name || '';

  const handleSaveProfileName = async (e: FormEvent) => {
    e.preventDefault();
    await updateProfile({ display_name: name.trim() });
    setEditProfileOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveCycleSettings = async (e: FormEvent) => {
    e.preventDefault();
    await updateProfile({
      typical_cycle_length: Number(cycleLength),
      typical_period_length: Number(periodLength),
    });
    setCycleSettingsOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePurge = async () => {
    await purgeAccountData();
    setPurgeConfirmOpen(false);
    setLocation('/welcome');
  };

  return (
    <AppShell>
      <PageTitle eyebrow="Your space, your choices" title="Profile & Settings">
        <button
          onClick={() => {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="flex items-center gap-2 rounded-full bg-[#e9779d] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:-translate-y-0.5"
          data-testid="button-save-profile"
        >
          <Check className="h-3.5 w-3.5" /> {saved ? 'Saved' : 'Save Changes'}
        </button>
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        {/* User Card matching reference image */}
        <Card className="border border-white/60 bg-gradient-to-br from-[#fcf9fc]/90 to-[#fdfafc]/90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.6)] backdrop-blur-xl" testid="card-profile-summary">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-white/80 text-xl font-bold text-[#b85d80] shadow-[0_2px_8px_rgba(213,101,138,0.12)]">
              {displayName.charAt(0)}
            </div>
            <div>
              <h2 className="font-display text-[1.6rem] leading-tight text-[#584153]">{displayName}</h2>
              <p className="mt-0.5 text-[11px] text-[#9b8492]">View and manage your profile</p>
            </div>
            <button
              onClick={() => {
                setName(displayName);
                setEditProfileOpen(true);
              }}
              className="ml-auto rounded-full bg-white/50 p-2 text-[#a48898] shadow-sm backdrop-blur-sm transition hover:bg-white/80"
              data-testid="button-edit-profile"
              aria-label="Edit Profile"
            >
              <Pencil className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-white/60 p-4 shadow-sm backdrop-blur-md border border-white/40">
            <p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#917aa9]">Current Health Mode</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#67506f]">{modeDetails[mode].title}</span>
              <Link href="/mode" className="text-[11px] font-bold text-[#8b6ba7] hover:underline" data-testid="link-change-mode">
                Change
              </Link>
            </div>
          </div>

          <div className="mt-6 border-t border-[#f0e3ea]/60 pt-5">
            {signedIn ? (
              <button
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/40 py-3 text-[13px] font-bold text-[#966b86] shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/80"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            ) : (
              <Link
                href="/auth"
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#d65f8a] py-4 text-[13px] font-bold text-white shadow-[0_8px_20px_rgba(214,95,138,0.25)] transition hover:-translate-y-1 hover:bg-[#bd4e75]"
              >
                <UserCheck className="h-4 w-4" /> Sign In / Create Account
              </Link>
            )}
          </div>
        </Card>

        {/* Settings Sections matching reference image */}
        <div className="space-y-4">
          {/* Health Profile */}
          <SettingSection title="Health Profile" icon={<HeartPulse />}>
            <SettingRow label="Reproductive Health Mode" detail={modeDetails[mode].title}>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ReproductiveMode)}
                className="rounded-lg border border-[#eadde6] bg-white px-2 py-1 text-xs text-[#806a7b] outline-none"
                data-testid="select-health-mode"
              >
                <option value="not-pregnant">Not Pregnant</option>
                <option value="pregnant">Pregnant</option>
                <option value="postpartum">Postpartum</option>
              </select>
            </SettingRow>

            <SettingRow label="Cycle &amp; Period Settings" detail={`${profile?.typical_cycle_length || 28} day average`}>
              <button
                onClick={() => setCycleSettingsOpen(true)}
                className="text-[#bca4b3] hover:text-[#886480]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </SettingRow>
          </SettingSection>

          {/* Privacy & Data */}
          <SettingSection title="Privacy &amp; Data" icon={<ShieldCheck />}>
            <SettingRow label="Privacy Settings" detail={privacy ? 'Private Floor On • Isolated' : 'Standard'}>
              <button
                onClick={() => setPrivacy(!privacy)}
                className={`relative h-6 w-11 rounded-full transition ${privacy ? 'bg-[#d77d9c]' : 'bg-[#dacbd5]'}`}
                data-testid="button-toggle-private-floor"
                aria-label="Toggle Privacy"
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${privacy ? 'right-1' : 'left-1'}`} />
              </button>
            </SettingRow>

            <SettingRow label="Data &amp; Security" detail="Supabase Row Level Security protected">
              <span className="text-[#89b391]">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </SettingRow>

            <SettingRow label="Export My Data" detail="Download full JSON archive">
              <button
                onClick={exportData}
                className="flex items-center gap-1 text-xs font-bold text-[#916b8b] hover:text-[#c45a80]"
                data-testid="button-export-data"
              >
                <Download className="h-4 w-4" />
              </button>
            </SettingRow>

            <SettingRow label="Delete My Data" detail="Erase all health data">
              <button
                onClick={() => setPurgeConfirmOpen(true)}
                className="text-xs font-bold text-[#c75d7b] hover:underline"
                data-testid="button-delete-data"
              >
                Delete &gt;
              </button>
            </SettingRow>
          </SettingSection>

          {/* Account */}
          <SettingSection title="Account" icon={<SlidersHorizontal />}>
            <SettingRow label="Notifications" detail="Daily gentle reminders">
              <button
                onClick={() => setNotifications(!notifications)}
                className={`relative h-6 w-11 rounded-full transition ${notifications ? 'bg-[#d77d9c]' : 'bg-[#dacbd5]'}`}
                data-testid="button-toggle-notifications"
                aria-label="Toggle Notifications"
              >
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${notifications ? 'right-1' : 'left-1'}`} />
              </button>
            </SettingRow>

            <SettingRow label="Help &amp; Support" detail="Gentle guidance">
              <ChevronRight className="h-4 w-4 text-[#bca4b3]" />
            </SettingRow>
          </SettingSection>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
        <form onSubmit={handleSaveProfileName} className="space-y-4">
          <label className="block text-xs font-bold text-[#6f576a]">
            Display Name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sita-input mt-2"
            />
          </label>
          <button type="submit" className="w-full rounded-full bg-[#e9779d] py-3 text-xs font-bold text-white">
            Save Profile
          </button>
        </form>
      </Modal>

      {/* Cycle Settings Modal */}
      <Modal isOpen={cycleSettingsOpen} onClose={() => setCycleSettingsOpen(false)} title="Cycle & Period Settings">
        <form onSubmit={handleSaveCycleSettings} className="space-y-4">
          <label className="block text-xs font-bold text-[#6f576a]">
            Typical Cycle Length (days)
            <input
              type="number"
              min="15"
              max="60"
              required
              value={cycleLength}
              onChange={(e) => setCycleLength(e.target.value)}
              className="sita-input mt-2"
            />
          </label>
          <label className="block text-xs font-bold text-[#6f576a]">
            Typical Period Length (days)
            <input
              type="number"
              min="1"
              max="15"
              required
              value={periodLength}
              onChange={(e) => setPeriodLength(e.target.value)}
              className="sita-input mt-2"
            />
          </label>
          <button type="submit" className="w-full rounded-full bg-[#e9779d] py-3 text-xs font-bold text-white">
            Save Settings
          </button>
        </form>
      </Modal>

      {/* Purge Account Data Confirmation Modal */}
      <Modal isOpen={purgeConfirmOpen} onClose={() => setPurgeConfirmOpen(false)} title="Delete All Health Data">
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#fff0f3] p-4 text-xs leading-relaxed text-[#b55271]">
            <p className="font-bold">Warning: This action is permanent.</p>
            <p className="mt-1">
              All your cycle logs, mood check-ins, pregnancy data, postpartum records, screening results, and chat history will be permanently deleted from the database.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPurgeConfirmOpen(false)}
              className="flex-1 rounded-full border border-[#eedde6] py-3 text-xs font-bold text-[#897384]"
            >
              Cancel
            </button>
            <button
              onClick={handlePurge}
              className="flex-1 rounded-full bg-[#d75477] py-3 text-xs font-bold text-white shadow-sm hover:bg-[#c04364]"
            >
              Permanently Delete
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}

function SettingSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[1.35rem] border border-white/60 bg-white/40 px-5 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/40 py-4">
        <span className="text-[#ba7b98] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        <h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#866d7d]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SettingRow({ label, detail, children }: { label: string; detail: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/40 py-4 last:border-0">
      <div>
        <p className="text-xs font-semibold text-[#665064]">{label}</p>
        <p className="mt-0.5 text-[10px] text-[#a18c98]">{detail}</p>
      </div>
      {children}
    </div>
  );
}


// ==========================================
// PATTERN RADAR
// ==========================================
function PatternRadarCard() {
  const { periodDateStrings, symptomLogs, moodEntries, profile } = useSitaStore();
  const alerts = useMemo(() => {
    return analyzeHealthPatterns(periodDateStrings, symptomLogs, moodEntries, profile?.typical_cycle_length || 28);
  }, [periodDateStrings, symptomLogs, moodEntries, profile]);
  
  const alert = alerts[0];
  if (!alert) return null;
  
  const bgColors = {
    green: 'bg-gradient-to-br from-[#f1f8f2]/90 to-[#f9fbf9]/90 border-[#e1ece4]',
    yellow: 'bg-gradient-to-br from-[#fffdf0]/90 to-[#fffef8]/90 border-[#f2edc2]',
    orange: 'bg-gradient-to-br from-[#fff7f0]/90 to-[#fffaf5]/90 border-[#f5e3d3]',
    red: 'bg-gradient-to-br from-[#fff0f0]/90 to-[#fff8f8]/90 border-[#fad4d4]'
  };
  const iconColors = {
    green: 'text-[#5d8b67]',
    yellow: 'text-[#d6a524]',
    orange: 'text-[#d1743a]',
    red: 'text-[#c74c4c]'
  };

  return (
    <Card className={`border bg-white/40 shadow-sm backdrop-blur-xl ${bgColors[alert.severity]}`} testid="card-pattern-radar">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[1.4rem] text-[#553f54]">Your Health Patterns</h2>
        <Activity className={`h-5 w-5 ${iconColors[alert.severity]}`} />
      </div>
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-1">
           {alert.severity === 'green' ? '🟢' : alert.severity === 'yellow' ? '🟡' : alert.severity === 'orange' ? '🟠' : '🔴'}
        </div>
        <div>
           <p className="font-bold text-[#553f54] text-sm">{alert.title}</p>
           <p className="text-xs text-[#7a6575] leading-relaxed mt-1">{alert.description}</p>
        </div>
      </div>
      <Link href={alert.actionUrl} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8064a2] transition hover:text-[#614b7e]">
        {alert.actionLabel} <ArrowRight className="h-3 w-3" />
      </Link>
    </Card>
  );
}

// ==========================================
// HEALTH TIMELINE PAGE
// ==========================================
export function HealthTimelinePage() {
  const [, setLocation] = useLocation();
  const { periodDateStrings, symptomLogs, moodEntries } = useSitaStore();

  const allEvents = useMemo(() => {
    const events: { date: Date; type: string; title: string; desc: string; icon: ReactNode; color: string }[] = [];
    
    periodDateStrings.forEach(dStr => {
      events.push({
        date: new Date(dStr),
        type: 'period',
        title: 'Period Logged',
        desc: 'Cycle day recorded.',
        icon: <Droplets className="h-4 w-4" />,
        color: 'bg-[#e981a1] text-white',
      });
    });

    symptomLogs.forEach(s => {
      events.push({
        date: new Date(s.logged_at),
        type: 'symptom',
        title: 'Symptom Logged',
        desc: `${s.symptom} (${s.severity})`,
        icon: <Sparkles className="h-4 w-4" />,
        color: 'bg-[#8871ac] text-white',
      });
    });

    moodEntries.forEach(m => {
      events.push({
        date: new Date(m.date),
        type: 'mood',
        title: 'Mood Logged',
        desc: m.mood.charAt(0).toUpperCase() + m.mood.slice(1),
        icon: <Sun className="h-4 w-4" />,
        color: 'bg-[#ca9960] text-white',
      });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [periodDateStrings, symptomLogs, moodEntries]);

  return (
    <AppShell>
      <PageTitle eyebrow="Your History" title="Health Timeline">
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 rounded-full border border-[#eddfe6] bg-white px-3.5 py-2 text-xs font-semibold text-[#876e81] shadow-sm hover:bg-[#fff0f4]"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </button>
      </PageTitle>

      <div className="mx-auto max-w-3xl">
        <Card className="p-8">
          {allEvents.length === 0 ? (
            <div className="py-12 text-center text-[#8c78aa]">
              <Clock className="mx-auto h-8 w-8 opacity-50" />
              <p className="mt-4 text-sm font-semibold">No health events logged yet.</p>
              <p className="mt-1 text-xs">Start logging periods, symptoms, or moods to see your timeline.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-[#f2e6eb] ml-4 space-y-8 pb-4">
              {allEvents.map((evt, idx) => (
                <div key={idx} className="relative pl-8">
                  <div className={`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-4 ring-white ${evt.color}`}>
                    {evt.icon}
                  </div>
                  <div className="rounded-2xl border border-[#f0e2e8] bg-white/50 p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#553f54]">{evt.title}</h3>
                      <span className="text-xs font-semibold text-[#a68c9f]">
                        {evt.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#7a6575]">{evt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

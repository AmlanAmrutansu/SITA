import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, ShieldCheck, Calendar, Baby, HeartPulse, Activity, Sparkles, Play, Pause
} from 'lucide-react';
import { OriginalSitaMark } from '@/components/AppShell';

const FEATURES = [
  {
    id: 'cycle',
    title: 'Personalized Cycle',
    icon: Calendar,
    color: '#d65f8a',
    description: 'Your calendar adapts to YOUR pattern, predicting fertile windows and tracking symptoms.',
    demo: 'cycle'
  },
  {
    id: 'pregnancy',
    title: 'Pregnancy Mode',
    icon: Baby,
    color: '#9f6a80',
    description: 'SITA adapts when your health journey changes, tracking milestones and checks.',
    demo: 'pregnancy'
  },
  {
    id: 'postpartum',
    title: 'Postpartum Mode',
    icon: HeartPulse,
    color: '#8c6b84',
    description: 'Monitor your recovery, mood, and symptoms as your body heals.',
    demo: 'postpartum'
  },
  {
    id: 'assessments',
    title: 'Health Assessments',
    icon: Activity,
    color: '#5d4662',
    description: 'PCOS awareness and symptom triage. Understand patterns that may deserve attention.',
    demo: 'assessments'
  },
  {
    id: 'ai',
    title: 'SITA AI',
    icon: Sparkles,
    color: '#4c3850',
    description: 'Personalized guidance that connects your cycle, mood, and assessment patterns.',
    demo: 'ai'
  }
];

export function WelcomePage() {
  const [, setLocation] = useLocation();
  const [activeFeature, setActiveFeature] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % FEATURES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-[#faf7f9] text-[#4c3850] selection:bg-[#fce8ef] selection:text-[#5d4662] font-sans">
      {/* Background Orbs */}
      <div className="absolute -left-[10%] top-[-10%] h-[40rem] w-[40rem] lg:h-[60rem] lg:w-[60rem] animate-pulse rounded-full bg-gradient-to-r from-[#ffd1e3] to-[#f4b6cc] opacity-70 blur-[140px] duration-[8000ms] pointer-events-none" />
      <div className="absolute -right-[10%] bottom-[-10%] h-[45rem] w-[45rem] lg:h-[65rem] lg:w-[65rem] animate-pulse rounded-full bg-gradient-to-r from-[#e7d8f3] to-[#fce8ef] opacity-70 blur-[160px] duration-[10000ms] pointer-events-none" />
      
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-12 lg:py-24 relative z-10 min-h-screen flex flex-col justify-center">
        
        {/* Header / Nav */}
        <header className="absolute top-6 left-6 right-6 lg:top-10 lg:left-12 lg:right-12 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <OriginalSitaMark className="h-10 w-10 drop-shadow-sm" />
            <span className="font-display font-semibold tracking-wide text-xl text-[#4c3850]">SITA</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLocation('/auth?mode=signin')}
              className="text-sm font-semibold text-[#5d4662] hover:text-[#d65f8a] transition-colors px-4 py-2 rounded-full hover:bg-white/50"
            >
              Sign In
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-24 items-center mt-12 lg:mt-0">
          
          {/* LEFT: HERO */}
          <div className="flex flex-col items-start text-left max-w-xl z-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-display text-5xl lg:text-7xl leading-[1.05] tracking-[-.03em] text-[#4c3850] mb-6">
                Your Health.<br />
                Your Pattern.<br />
                <span className="text-[#9f6a80]">Your SITA.</span>
              </h1>
              <p className="text-lg lg:text-xl text-[#7a6575] leading-relaxed mb-10 max-w-md">
                A premium space designed for understanding your reproductive wellness, cycle, pregnancy, and postpartum patterns with personalized AI guidance.
              </p>
              
              <div className="flex flex-col sm:flex-row w-full gap-4">
                <button
                  onClick={() => setLocation('/auth?mode=signup')}
                  className="group flex items-center justify-center gap-3 rounded-full bg-[#5d4662] px-8 py-4 text-base font-bold text-white shadow-[0_8px_24px_rgba(93,70,98,.25)] transition-all hover:-translate-y-0.5 hover:bg-[#4a364e] hover:shadow-[0_12px_32px_rgba(93,70,98,.35)] w-full sm:w-auto"
                >
                  Create Your SITA Profile <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => setLocation('/auth?mode=signin')}
                  className="flex items-center justify-center rounded-full border border-[#5d4662]/15 bg-white/50 px-8 py-4 text-base font-bold text-[#5d4662] backdrop-blur-md transition-all hover:bg-white/80 hover:-translate-y-0.5 w-full sm:w-auto"
                >
                  Sign In
                </button>
              </div>
              
              <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#9b8599]">
                <ShieldCheck className="h-4 w-4" /> Privacy first. Medically responsible.
              </div>
            </motion.div>
          </div>

          {/* RIGHT: ANIMATED SHOWCASE */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-br from-[#ffd1e3]/40 to-[#d65f8a]/20 blur-[80px] rounded-full z-0 pointer-events-none " />
          <div className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] max-w-lg mx-auto z-20">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute inset-0 rounded-[3rem] border border-white/80 bg-white/40 p-6 sm:p-8 shadow-[0_15px_40px_-15px_rgba(214,95,138,0.2),inset_0_1px_5px_rgba(255,255,255,0.8)] backdrop-blur-2xl overflow-hidden flex flex-col"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              
              {/* Feature Navigator */}
              <div className="flex items-center justify-between gap-2 mb-8 z-30">
                <div className="flex gap-2">
                  {FEATURES.map((feat, idx) => (
                    <button 
                      key={feat.id}
                      onClick={() => setActiveFeature(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${activeFeature === idx ? 'w-8 bg-[#5d4662]' : 'w-2 bg-[#5d4662]/20 hover:bg-[#5d4662]/40'}`}
                      aria-label={`Show ${feat.title}`}
                    />
                  ))}
                </div>
                <button 
                  onClick={() => setIsPaused(!isPaused)} 
                  className="text-[#9b8599] hover:text-[#5d4662] transition-colors p-1"
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              </div>

              {/* Feature Content */}
              <div className="flex-1 relative z-20">
                <AnimatePresence>
                  <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0 flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 rounded-2xl bg-white/70 shadow-sm text-[#5d4662]">
                        {(() => {
                          const Icon = FEATURES[activeFeature].icon;
                          return <Icon className="w-5 h-5" />;
                        })()}
                      </div>
                      <h3 className="font-display text-2xl font-semibold text-[#4c3850]">
                        {FEATURES[activeFeature].title}
                      </h3>
                    </div>
                    <p className="text-[15px] text-[#7a6575] mb-6 leading-relaxed pr-4">
                      {FEATURES[activeFeature].description}
                    </p>

                    {/* Demo UI Visualization */}
                    <div className="flex-1 w-full rounded-[1.5rem] bg-gradient-to-br from-white/80 to-white/30 border border-white/60 shadow-inner overflow-hidden relative">
                      <DemoVisualizer type={FEATURES[activeFeature].demo} />
                    </div>

                  </motion.div>
                </AnimatePresence>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------
// DEMO VISUALIZERS
// -----------------------------------------------------

function DemoVisualizer({ type }: { type: string }) {
  switch(type) {
    case 'cycle': return <CycleDemo />;
    case 'pregnancy': return <PregnancyDemo />;
    case 'postpartum': return <PostpartumDemo />;
    case 'assessments': return <AssessmentDemo />;
    case 'ai': return <AIDemo />;
    default: return null;
  }
}

function CycleDemo() {
  return (
    <div className="p-5 h-full flex flex-col justify-center">
      <div className="text-center mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b8599] bg-white/50 px-3 py-1 rounded-full">Illustrative Pattern</span>
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: 14 }).map((_, i) => {
          let bg = 'bg-white/40';
          let border = 'border-transparent';
          let content = '';
          let textCol = 'text-[#7a6575]';
          
          if (i >= 2 && i <= 5) {
            bg = 'bg-[#fce8ef]';
            border = 'border-[#d65f8a]/20';
            content = '🩸';
          } else if (i >= 10 && i <= 13) {
            bg = 'bg-[#e0f2fe]';
            border = 'border-[#0284c7]/20';
            if (i === 12) content = '🥚';
          } else {
            content = `${i + 1}`;
            textCol = 'text-[#a895a5]';
          }

          return (
            <motion.div 
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, type: 'spring' }}
              className={`aspect-square rounded-xl border ${bg} ${border} flex items-center justify-center text-[10px] sm:text-xs font-semibold ${textCol} shadow-sm`}
            >
              {content}
            </motion.div>
          );
        })}
      </div>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-8 p-4 rounded-xl bg-white/60 shadow-lg border border-white/50 flex justify-between items-center backdrop-blur-sm"
      >
        <div className="flex flex-col">
          <span className="text-xs text-[#9b8599] font-semibold mb-0.5">Predicted Ovulation</span>
          <span className="text-sm font-bold text-[#5d4662]">In 3 days</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-[#0284c7]/10 text-[#0284c7] flex items-center justify-center text-xs">
          🥚
        </div>
      </motion.div>
    </div>
  );
}

function PregnancyDemo() {
  return (
    <div className="p-5 h-full flex flex-col justify-center">
      <div className="text-center mb-8">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b8599] bg-white/50 px-3 py-1 rounded-full">Illustrative Milestone</span>
      </div>
      
      <div className="relative w-36 h-36 mx-auto mb-8">
        <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="8" />
          <motion.circle 
            cx="50" cy="50" r="45" 
            fill="none" 
            stroke="#9f6a80" 
            strokeWidth="8" 
            strokeLinecap="round"
            strokeDasharray="283"
            initial={{ strokeDashoffset: 283 }}
            animate={{ strokeDashoffset: 100 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-display font-semibold text-[#5d4662]">26</span>
          <span className="text-xs font-bold uppercase tracking-widest text-[#9f6a80] mt-1">Weeks</span>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="space-y-3"
      >
        <div className="p-4 rounded-xl bg-white/60 shadow-lg border border-white/50 flex justify-between items-center backdrop-blur-sm">
          <span className="text-sm font-semibold text-[#5d4662]">Baby Size</span>
          <span className="text-sm font-medium bg-[#8c6b84]/10 text-[#8c6b84] px-3 py-1 rounded-full">🥬 Lettuce</span>
        </div>
      </motion.div>
    </div>
  );
}

function PostpartumDemo() {
  return (
    <div className="p-5 h-full flex flex-col justify-center">
      <div className="text-center mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b8599] bg-white/50 px-3 py-1 rounded-full">Recovery Insight</span>
      </div>
      
      <div className="space-y-5">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl bg-white/60 shadow-lg border border-white/50 backdrop-blur-sm"
        >
          <div className="flex justify-between items-end mb-4">
            <span className="text-sm font-semibold text-[#5d4662]">Mood Trend</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c6b84] bg-[#8c6b84]/10 px-2 py-1 rounded-md">Improving</span>
          </div>
          <div className="flex gap-2 h-12 items-end">
            {[40, 30, 50, 60, 80].map((h, i) => (
              <motion.div 
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.4 + (i * 0.1) }}
                className="flex-1 bg-gradient-to-t from-[#8c6b84]/40 to-[#8c6b84]/60 rounded-sm"
              />
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 1 }}
          className="p-4 rounded-2xl bg-[#8c6b84]/10 border border-[#8c6b84]/20 shadow-sm flex items-start gap-3 backdrop-blur-sm"
        >
          <div className="mt-0.5 p-1.5 rounded-full bg-[#8c6b84]/10"><Activity className="w-4 h-4 text-[#8c6b84]" /></div>
          <p className="text-sm text-[#5d4662] leading-relaxed font-medium">
            Fewer physical symptoms logged this week. Remember to prioritize hydration.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function AssessmentDemo() {
  return (
    <div className="p-5 h-full flex flex-col justify-center">
      <div className="text-center mb-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b8599] bg-white/50 px-3 py-1 rounded-full">PCOS Awareness</span>
      </div>

      <div className="space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-white/60 shadow-lg border border-white/50 backdrop-blur-sm"
        >
          <p className="text-[15px] font-semibold text-[#5d4662] mb-4">Do you experience irregular cycles?</p>
          <div className="flex gap-3">
            <div className="flex-1 py-2 text-center text-sm font-bold rounded-xl bg-[#5d4662] text-white shadow-md">Yes</div>
            <div className="flex-1 py-2 text-center text-sm font-bold rounded-xl bg-white border border-[#5d4662]/10 text-[#5d4662]">No</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ delay: 1 }}
          className="overflow-hidden"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#fce8ef]/80 to-white/40 border border-[#d65f8a]/30 shadow-inner mt-2 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d65f8a] animate-pulse" />
              <span className="text-xs font-bold text-[#4c3850] uppercase tracking-wide">Moderate Likelihood</span>
            </div>
            <p className="text-sm text-[#7a6575] leading-relaxed mt-2 font-medium">
              Based on your pattern of irregular cycles, you matched criteria that may deserve attention.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function AIDemo() {
  return (
    <div className="p-5 h-full flex flex-col">
      <div className="text-center mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9b8599] bg-white/50 px-3 py-1 rounded-full">AI Context Engine</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-4 pt-2 justify-end pb-2">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="self-end max-w-[85%] p-3.5 rounded-2xl rounded-tr-sm bg-white border border-white/60 shadow-sm text-[13.5px] font-medium text-[#4c3850]"
        >
          I've noticed some changes in my cycle recently.
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          className="self-center flex items-center gap-2 py-1.5 px-4 rounded-full bg-[#5d4662]/5 border border-[#5d4662]/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#9b8599] animate-pulse" />
          <span className="text-[10px] font-bold text-[#9b8599] uppercase tracking-wider">Connecting patterns...</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 2.5 }}
          className="self-start max-w-[95%] p-4 rounded-2xl rounded-tl-sm bg-[#5d4662] text-white text-[13.5px] font-medium shadow-[0_8px_20px_rgba(93,70,98,.2)]"
        >
          <p className="leading-relaxed">
            Your last two cycles were 35 and 38 days, and you recently recorded severe cramps. 
          </p>
          <p className="leading-relaxed mt-2 text-white/90">
            Given your recent PCOS assessment, this shift is worth discussing with your doctor.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

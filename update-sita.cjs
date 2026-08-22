const fs = require('fs');

// 1. Update sita-pages.tsx
let pages = fs.readFileSync('/app/applet/artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');

// Inject analyzeHealthPatterns import
if (!pages.includes("import { analyzeHealthPatterns }")) {
  pages = pages.replace(
    "import { calculateCycleSummary",
    "import { analyzeHealthPatterns } from '@/lib/pattern-radar';\nimport { calculateCycleSummary"
  );
}

// Inject PatternRadarCard and HealthTimelinePage at the bottom
if (!pages.includes("export function HealthTimelinePage()")) {
  pages += `

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
    <Card className={\`border bg-white/40 shadow-sm backdrop-blur-xl \${bgColors[alert.severity]}\`} testid="card-pattern-radar">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[1.4rem] text-[#553f54]">Your Health Patterns</h2>
        <Activity className={\`h-5 w-5 \${iconColors[alert.severity]}\`} />
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
        desc: \`\${s.symptom} (\${s.severity})\`,
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
                  <div className={\`absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ring-4 ring-white \${evt.color}\`}>
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
`;
}

// Inject PatternRadarCard into HomePage
if (!pages.includes("<PatternRadarCard />")) {
  pages = pages.replace(
    "{/* Right Column: Quick Actions & SITA CTA */}",
    "{/* Right Column: Quick Actions & SITA CTA */}\n        <div className=\"space-y-5\">\n          <PatternRadarCard />"
  ).replace(
    "<div className=\"space-y-5\">\n        <div className=\"space-y-5\">\n          <PatternRadarCard />", 
    "<div className=\"space-y-5\">\n          <PatternRadarCard />" // Fix replacement artifact if needed
  );
}

fs.writeFileSync('/app/applet/artifacts/sita-health/src/pages/sita-pages.tsx', pages);

// 2. Update App.tsx
let app = fs.readFileSync('/app/applet/artifacts/sita-health/src/App.tsx', 'utf8');

if (!app.includes("HealthTimelinePage")) {
  app = app.replace(
    "ProfilePage } from '@/pages/sita-pages';",
    "ProfilePage, HealthTimelinePage } from '@/pages/sita-pages';"
  );
  app = app.replace(
    "<Route path=\"/profile\" component={() => <AuthGuard component={ProfilePage} />} />",
    "<Route path=\"/profile\" component={() => <AuthGuard component={ProfilePage} />} />\n        <Route path=\"/timeline\" component={() => <AuthGuard component={HealthTimelinePage} />} />"
  );
}

fs.writeFileSync('/app/applet/artifacts/sita-health/src/App.tsx', app);

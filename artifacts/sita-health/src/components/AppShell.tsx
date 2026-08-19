import { Baby, Bell, CalendarDays, ChevronRight, Home, Menu, MessageCircle, Settings, Smile, Sparkles, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { navItems } from '@/data/mock';
import { useSitaStore } from '@/data/store';

const iconMap = { home: Home, calendar: CalendarDays, smile: Smile, sparkles: Sparkles, user: UserRound, baby: Baby };

export function SitaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" data-testid="link-logo-home">
      <span className="grid h-9 w-9 place-items-center rounded-[38%] bg-[#e5799e] text-white shadow-[0_5px_15px_rgba(212,100,137,.24)]">
        <Sparkles className="h-4.5 w-4.5" strokeWidth={1.8} />
      </span>
      {!compact && <span className="font-display text-[1.65rem] leading-none tracking-[-.04em] text-[#4c3850]">SITA</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode, profile } = useSitaStore();
  const contextualNav = mode === 'pregnant'
    ? navItems.map((item) => item.href === '/cycle' ? { ...item, href: '/pregnancy', label: 'Pregnancy', icon: 'baby' as const } : item)
    : mode === 'postpartum'
      ? navItems.map((item) => item.href === '/cycle' ? { ...item, href: '/postpartum', label: 'Postpartum', icon: 'baby' as const } : item)
      : navItems;

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const userInitial = (profile?.name || profile?.display_name || 'S').trim().charAt(0).toUpperCase() || 'S';

  return (
    <div className="sita-noise app-shell flex bg-transparent">
      <aside className="desktop-side sticky top-0 hidden h-dvh w-[238px] shrink-0 flex-col border-r border-[#eadce4] bg-[#fffafb]/80 px-5 py-7 backdrop-blur-xl md:flex">
        <SitaLogo />
        <p className="mb-9 mt-3 pl-11 text-[10px] font-semibold uppercase tracking-[.18em] text-[#a88c9f]">Your health companion</p>
        <nav className="space-y-1.5" aria-label="Primary navigation">
          {contextualNav.map((item) => {
            const Icon = iconMap[item.icon];
            const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
            return <Link key={item.href} href={item.href} data-testid={`link-nav-${item.label.toLowerCase()}`} className={`group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all ${active ? 'bg-[#f9dce7] text-[#b85779] shadow-sm' : 'text-[#846e80] hover:bg-[#fbf0f4] hover:text-[#b85779]'}`}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.3 : 1.7} /><span>{item.label}</span>
              {item.label === 'SITA' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#91b096]" />}
            </Link>;
          })}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f2ecf8] p-4">
          <div className="mb-3 flex items-center gap-2 text-[#7f6b9b]"><Sparkles className="h-4 w-4" /><span className="text-xs font-bold">A softer way to know yourself</span></div>
          <p className="text-[11px] leading-relaxed text-[#806f88]">Small check-ins create a kinder picture over time.</p>
          <Link href="/sita" className="mt-3 flex items-center text-[11px] font-bold text-[#8467a2]" data-testid="link-sidebar-sita">Talk to SITA <ChevronRight className="ml-1 h-3 w-3" /></Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#eee2e7]/80 bg-[#fffafa]/78 px-5 backdrop-blur-xl md:px-9">
          <div className="md:hidden"><SitaLogo compact /></div>
          <div className="hidden text-sm font-semibold text-[#a08b9b] md:block">{location === '/' ? todayStr : 'Your private health space'}</div>
          <div className="ml-auto flex items-center gap-2.5">
            <button onClick={() => setMenuOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full bg-[#fff1f5] text-[#aa7188] transition-transform hover:scale-105" data-testid="button-notifications" aria-label="Notifications"><Bell className="h-[18px] w-[18px]" strokeWidth={1.7} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#dc6e93]" /></button>
            <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-[#e9dfef] text-xs font-bold text-[#806a98]" data-testid="link-header-profile">{userInitial}</Link>
            <button onClick={() => setMenuOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-[#8a7383] md:hidden" data-testid="button-open-menu" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="app-content px-4 pb-28 pt-7 sm:px-6 md:px-9 md:pb-12 md:pt-9">{children}</main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[76px] items-center justify-around border-t border-[#eadfe5] bg-[#fffafa]/94 px-2 backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
         {contextualNav.map((item) => {
          const Icon = iconMap[item.icon];
          const active = item.href === '/' ? location === '/' : location.startsWith(item.href);
          return <Link href={item.href} key={item.href} className={`flex min-w-[55px] flex-col items-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold ${active ? 'text-[#c65f83]' : 'text-[#9b8995]'}`} data-testid={`link-mobile-${item.label.toLowerCase()}`}><span className={`grid h-7 w-9 place-items-center rounded-full ${active ? 'bg-[#f7dce6]' : ''}`}><Icon className="h-[17px] w-[17px]" strokeWidth={active ? 2.4 : 1.7} /></span>{item.label}</Link>;
        })}
      </nav>
      {menuOpen && <div className="fixed inset-0 z-50 bg-[#443347]/20 backdrop-blur-sm md:hidden" onClick={() => setMenuOpen(false)}>
        <div className="ml-auto h-full w-[78%] max-w-[310px] bg-[#fffafa] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="mb-10 flex items-center justify-between"><SitaLogo /><button onClick={() => setMenuOpen(false)} className="rounded-full bg-[#f8edf2] p-2 text-[#8e7184]" data-testid="button-close-menu" aria-label="Close menu"><X className="h-4 w-4" /></button></div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#b18fa1]">More of your space</p>
          <Link href="/insights" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 border-b border-[#f0e2e8] py-4 text-sm font-semibold text-[#6e586d]" data-testid="link-menu-insights"><Smile className="h-4 w-4 text-[#b188bd]" />Mood insights</Link>
          <Link href="/mode" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 border-b border-[#f0e2e8] py-4 text-sm font-semibold text-[#6e586d]" data-testid="link-menu-mode"><Settings className="h-4 w-4 text-[#b188bd]" />Health mode</Link>
          <Link href="/welcome" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-4 text-sm font-semibold text-[#6e586d]" data-testid="link-menu-welcome"><MessageCircle className="h-4 w-4 text-[#b188bd]" />Welcome</Link>
        </div>
      </div>}
    </div>
  );
}

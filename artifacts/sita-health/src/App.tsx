import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { SitaStoreProvider, useSitaStore } from '@/data/store';
import { WelcomePage, AuthPage, OnboardingPage, ModePage, HomePage, CyclePage, MoodPage, InsightsPage, SitaPage, PregnancyPage, PostpartumPage, ProfilePage, HealthTimelinePage } from '@/pages/sita-pages';
import { MedicalRecordsPage } from '@/pages/medical-records-page';

const queryClient = new QueryClient();

function AuthGuard({ component: Component, isPublic = false }: { component: any, isPublic?: boolean }) {
  const { signedIn, loading, profile } = useSitaStore();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!signedIn && !isPublic) {
        setLocation('/welcome');
      } else if (signedIn && profile && !profile.onboarding_complete && location !== '/onboarding' && location !== '/mode') {
        setLocation('/onboarding');
      } else if (signedIn && profile?.onboarding_complete && (location === '/welcome' || location === '/auth')) {
        setLocation('/');
      }
    }
  }, [loading, signedIn, profile, location, setLocation, isPublic]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fdfafc]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#fdfafc] border-t-[#d65f8a]" />
          <p className="font-display text-sm text-[#8c6b84] animate-pulse">Waking up SITA...</p>
        </div>
      </div>
    );
  }

  // Prevent rendering protected routes while redirecting
  if (!signedIn && !isPublic) return null;
  if (signedIn && profile && !profile.onboarding_complete && location !== '/onboarding' && location !== '/mode') return null;

  return <Component />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/welcome" component={() => <AuthGuard component={WelcomePage} isPublic />} />
        <Route path="/auth" component={() => <AuthGuard component={AuthPage} isPublic />} />
        
        {/* Protected Routes */}
        <Route path="/onboarding" component={() => <AuthGuard component={OnboardingPage} />} />
        <Route path="/mode" component={() => <AuthGuard component={ModePage} />} />
        <Route path="/" component={() => <AuthGuard component={HomePage} />} />
        <Route path="/cycle" component={() => <AuthGuard component={CyclePage} />} />
        <Route path="/records" component={() => <AuthGuard component={MedicalRecordsPage} />} />
        <Route path="/mood" component={() => <AuthGuard component={MoodPage} />} />
        <Route path="/insights" component={() => <AuthGuard component={InsightsPage} />} />
        <Route path="/sita" component={() => <AuthGuard component={SitaPage} />} />
        <Route path="/pregnancy" component={() => <AuthGuard component={PregnancyPage} />} />
        <Route path="/postpartum" component={() => <AuthGuard component={PostpartumPage} />} />
        <Route path="/profile" component={() => <AuthGuard component={ProfilePage} />} />
        <Route path="/timeline" component={() => <AuthGuard component={HealthTimelinePage} />} />
        
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SitaStoreProvider>
          <WouterRouter base={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </SitaStoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
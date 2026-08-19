import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { SitaStoreProvider } from '@/data/store';
import { WelcomePage, AuthPage, ModePage, HomePage, CyclePage, MoodPage, InsightsPage, SitaPage, PregnancyPage, PostpartumPage, ProfilePage } from '@/pages/sita-pages';

const queryClient = new QueryClient();

function Router() {
  return <RoutedErrorBoundary>
    <Switch>
      <Route path="/welcome" component={WelcomePage} />
        <Route path="/auth" component={AuthPage} />
      <Route path="/mode" component={ModePage} />
      <Route path="/" component={HomePage} />
      <Route path="/cycle" component={CyclePage} />
      <Route path="/mood" component={MoodPage} />
      <Route path="/insights" component={InsightsPage} />
      <Route path="/sita" component={SitaPage} />
      <Route path="/pregnancy" component={PregnancyPage} />
      <Route path="/postpartum" component={PostpartumPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  </RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SitaStoreProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter>
      </SitaStoreProvider>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>;
}

export default App;
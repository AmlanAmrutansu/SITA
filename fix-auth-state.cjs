const fs = require('fs');

let content = fs.readFileSync('artifacts/sita-health/src/data/store.tsx', 'utf8');

// Insert import if needed
if (!content.includes('import { supabase } from')) {
  content = content.replace(
    `import { api } from '@/lib/api';`,
    `import { api } from '@/lib/api';\nimport { supabase } from '@/lib/supabase';`
  );
}

// Ensure the useEffect runs once on mount to handle auth state changes
const authStateEffect = `
  useEffect(() => {
    let mounted = true;
    
    // Initial fetch of session directly from Supabase
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        if (session?.user) {
          setSignedIn(true);
          setUser(session.user);
          refreshAll();
        } else {
          setSignedIn(false);
          setUser(null);
          setLoading(false);
        }
      }
    };
    
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setSignedIn(true);
        setUser(session.user);
        if (event === 'SIGNED_IN') {
          refreshAll();
        }
      } else {
        setSignedIn(false);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshAll]);
`;

// Remove the old useEffect(() => { refreshAll(); }, [refreshAll]);
content = content.replace(
  `  useEffect(() => {
    refreshAll();
  }, [refreshAll]);`,
  authStateEffect
);

// We should also modify refreshAll to rely on the current user rather than doing a separate session check,
// but actually removing the early return in refreshAll if !session.user works better.
content = content.replace(
  `      const session = await api.session();
      if (!session.user) {
        setSignedIn(false);
        setUser(null);
        return;
      }`,
  `      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSignedIn(false);
        setUser(null);
        setLoading(false);
        return;
      }`
);

fs.writeFileSync('artifacts/sita-health/src/data/store.tsx', content);


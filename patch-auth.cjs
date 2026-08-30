const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

const replacement = `export { WelcomePage } from './welcome-page';

// ==========================================
// 2. AUTH PAGE
// ==========================================
export function AuthPage() {
  const [, setLocation] = useLocation();
  const { signIn, signUp } = useSitaStore();
  const search = new URLSearchParams(window.location.search);
  const initialMode = search.get('mode') === 'signup' ? 'signup' : 'signin';
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (caught) {`;

code = code.replace(/export \{ WelcomePage \} from '\.\/welcome-page'; catch \(caught\) \{/, replacement);

fs.writeFileSync(path, code);

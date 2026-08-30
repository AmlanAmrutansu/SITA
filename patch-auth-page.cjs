const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /export function AuthPage\(\) \{\n  const \[, setLocation\] = useLocation\(\);\n  const search = new URLSearchParams\(window\.location\.search\);\n  const initialMode = search\.get\('mode'\) === 'signup' \? 'signup' : 'signin';\n  const \[signup, setSignup\] = useState\(initialMode === 'signup'\);/;

const replacement = `export function AuthPage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const search = new URLSearchParams(searchString);
  const modeParam = search.get('mode');
  const [signup, setSignup] = useState(modeParam === 'signup');

  useEffect(() => {
    setSignup(modeParam === 'signup');
  }, [modeParam]);`;

code = code.replace(regex, replacement);

fs.writeFileSync(path, code);

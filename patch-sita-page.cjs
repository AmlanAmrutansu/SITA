const fs = require('fs');
const path = './artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /export function SitaPage\(\) \{\n  const \{ messages, sendMessage, clearMessages, runPCOSScreening, runSymptomTriage, profile \} = useSitaStore\(\);\n  const \[text, setText\] = useState\(''\);\n  const \[sending, setSending\] = useState\(false\);\n  const \[pcosOpen, setPcosOpen\] = useState\(false\);\n  const \[triageOpen, setTriageOpen\] = useState\(false\);\n\n  useEffect\(\(\) => \{\n    const searchParams = new URLSearchParams\(window\.location\.search\);\n    if \(searchParams\.get\('pcos'\) === 'true'\) setPcosOpen\(true\);\n    if \(searchParams\.get\('triage'\) === 'true'\) setTriageOpen\(true\);\n  \}, \[\]\);/;

const replacement = `export function SitaPage() {
  const { messages, sendMessage, clearMessages, runPCOSScreening, runSymptomTriage, profile } = useSitaStore();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pcosOpen, setPcosOpen] = useState(false);
  const [triageOpen, setTriageOpen] = useState(false);
  const searchString = useSearch();

  useEffect(() => {
    const searchParams = new URLSearchParams(searchString);
    if (searchParams.get('pcos') === 'true') setPcosOpen(true);
    if (searchParams.get('triage') === 'true') setTriageOpen(true);
  }, [searchString]);`;

code = code.replace(regex, replacement);

fs.writeFileSync(path, code);

const fs = require('fs');
let pages = fs.readFileSync('/app/applet/artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');

if (!pages.includes("const searchParams = new URLSearchParams(window.location.search);")) {
  pages = pages.replace(
    "const [triageOpen, setTriageOpen] = useState(false);",
    "const [triageOpen, setTriageOpen] = useState(false);\n\n  useEffect(() => {\n    const searchParams = new URLSearchParams(window.location.search);\n    if (searchParams.get('pcos') === 'true') setPcosOpen(true);\n    if (searchParams.get('triage') === 'true') setTriageOpen(true);\n  }, []);"
  );
  fs.writeFileSync('/app/applet/artifacts/sita-health/src/pages/sita-pages.tsx', pages);
}

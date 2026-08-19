const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');
content = content.replace(
  "const [signup, setSignup] = useState(false);",
  "const [signup, setSignup] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'signup');"
);
fs.writeFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', content);

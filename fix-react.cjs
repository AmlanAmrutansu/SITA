const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(/import \{ useState, useMemo, useEffect \} from 'react';/, "import { useState, useMemo, useEffect, useRef } from 'react';\nimport type { FormEvent, ChangeEvent, MouseEvent } from 'react';");

code = code.replace(/React\.FormEvent/g, 'FormEvent');
code = code.replace(/React\.ChangeEvent/g, 'ChangeEvent');
code = code.replace(/React\.MouseEvent/g, 'MouseEvent');
code = code.replace(/React\.useRef/g, 'useRef');

fs.writeFileSync(path, code);
console.log("Fixed React refs");

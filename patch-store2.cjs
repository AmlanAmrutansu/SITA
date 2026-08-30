const fs = require('fs');
const path = 'artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

const stateAdditions = `
  const [postpartumData, setPostpartumData] = useState<PostpartumData>(defaultPostpartumData);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
`;

if (!code.includes('setMedicalRecords')) {
  code = code.replace(
    '  const [postpartumData, setPostpartumData] = useState<PostpartumData>(defaultPostpartumData);',
    stateAdditions
  );
}

fs.writeFileSync(path, code);

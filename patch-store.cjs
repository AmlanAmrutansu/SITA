const fs = require('fs');
const path = 'artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

const newInterfaces = `
export interface MedicalRecord {
  id?: string;
  title: string;
  document_type: string;
  document_date?: string;
  extracted_text?: string;
  structured_data: {
    doctor_name?: string;
    medicines?: string[];
    diagnoses?: string[];
    tests?: string[];
    notes?: string;
  };
  created_at?: string;
}

interface SitaStore {`;

if (!code.includes('interface MedicalRecord')) {
  code = code.replace('interface SitaStore {', newInterfaces);
}

const storeContextAdditions = `
  medicalRecords: MedicalRecord[];
  addMedicalRecord: (record: Omit<MedicalRecord, 'id'>) => Promise<void>;
  deleteMedicalRecord: (id: string) => Promise<void>;
`;

if (!code.includes('medicalRecords: MedicalRecord[];')) {
  code = code.replace(
    '  postpartumData: PostpartumData;',
    storeContextAdditions + '\n  postpartumData: PostpartumData;'
  );
}

fs.writeFileSync(path, code);

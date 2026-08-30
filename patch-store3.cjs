const fs = require('fs');
const path = 'artifacts/sita-health/src/data/store.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add to Promise.all array
code = code.replace(
  "        api.list<any>('chat_messages', 'created_at.asc', 50).catch(() => []),",
  "        api.list<any>('chat_messages', 'created_at.asc', 50).catch(() => []),\n        api.list<any>('medical_records', 'document_date.desc', 50).catch(() => []),"
);

code = code.replace(
  "        chatData,",
  "        chatData,\n        recordsData,"
);

// Set state
code = code.replace(
  "      } finally {",
  "        if (recordsData) {\n          setMedicalRecords(recordsData);\n        }\n      } finally {"
);

// Add methods
const methods = `
  const addMedicalRecord = async (record: Omit<MedicalRecord, 'id'>) => {
    try {
      const data = await api.insert('medical_records', record);
      if (data && data.length > 0) {
        setMedicalRecords((prev) => [data[0], ...prev]);
      }
    } catch (e) {
      console.error('Failed to add medical record', e);
      throw e;
    }
  };

  const deleteMedicalRecord = async (id: string) => {
    try {
      await api.delete('medical_records', id);
      setMedicalRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error('Failed to delete medical record', e);
      throw e;
    }
  };
`;
code = code.replace("  const updateProfile", methods + "\n  const updateProfile");

// Add to context value
code = code.replace(
  "      purgeAccountData,",
  "      medicalRecords,\n      addMedicalRecord,\n      deleteMedicalRecord,\n      purgeAccountData,"
);
code = code.replace(
  "      postpartumData,",
  "      postpartumData,\n      medicalRecords,"
);

fs.writeFileSync(path, code);

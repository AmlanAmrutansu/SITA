const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add state to SitaPage
const stateRegex = /const \[sending, setSending\] = useState\(false\);/;
const stateAdditions = `const [sending, setSending] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const { addMedicalRecord } = useSitaStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Read file as base64
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setUploadingDoc(true);
        const base64 = ev.target?.result;
        const res = await fetch('/api/extract-medical-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        });
        const data = await res.json();
        if (data.success) {
          setExtractedData(data);
        } else {
          alert('Could not process document: ' + data.error);
        }
      } catch (err) {
        alert('Upload failed');
      } finally {
        setUploadingDoc(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };
`;
code = code.replace(stateRegex, stateAdditions);

// 2. Add FilePlus button to the input area
const inputRegex = /<input\n\s*value=\{text\}/;
const inputAdditions = `
            <input type="file" accept="image/*,.pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || uploadingDoc}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#b19db2] transition hover:bg-white hover:text-[#5d4662]"
              title="Add Medical Record"
            >
              {uploadingDoc ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#b19db2] border-t-[#5d4662]" /> : <FilePlus className="h-4 w-4" />}
            </button>
            <input
              value={text}`;
code = code.replace(inputRegex, inputAdditions);

// 3. Add Medical Record Review Modal to the end of SitaPage
const modalRegex = /<\/div>\n    <\/AppShell>\n  \);\n\}/;
const modalAdditions = `
      {/* Medical Record Review Modal */}
      <Modal isOpen={!!extractedData} onClose={() => setExtractedData(null)} title="Review Medical Record">
        {extractedData && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await addMedicalRecord({
                  title: extractedData.structured_data.title || 'Untitled Record',
                  document_type: extractedData.structured_data.document_type || 'Unknown',
                  document_date: extractedData.structured_data.document_date || new Date().toISOString().split('T')[0],
                  extracted_text: extractedData.extracted_text,
                  structured_data: extractedData.structured_data
                });
                setExtractedData(null);
                // Optionally auto-send a message
                sendMessage("I just uploaded a new medical record: " + extractedData.structured_data.title);
              } catch (err) {
                alert('Failed to save record.');
              }
            }}
            className="space-y-4"
          >
            <p className="text-xs text-[#8c7487]">
              Please review the extracted information before saving. You can edit any incorrect details.
            </p>
            
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#765f71]">Title</label>
              <input 
                className="mt-1 w-full rounded-xl border border-[#f0e2e8] bg-[#fcf9fb] p-3 text-sm text-[#4d394e]"
                value={extractedData.structured_data.title || ''}
                onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, title: e.target.value}})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#765f71]">Type</label>
                <input 
                  className="mt-1 w-full rounded-xl border border-[#f0e2e8] bg-[#fcf9fb] p-3 text-sm text-[#4d394e]"
                  value={extractedData.structured_data.document_type || ''}
                  onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, document_type: e.target.value}})}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#765f71]">Date</label>
                <input 
                  type="date"
                  className="mt-1 w-full rounded-xl border border-[#f0e2e8] bg-[#fcf9fb] p-3 text-sm text-[#4d394e]"
                  value={extractedData.structured_data.document_date || ''}
                  onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, document_date: e.target.value}})}
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#765f71]">Doctor/Provider</label>
              <input 
                className="mt-1 w-full rounded-xl border border-[#f0e2e8] bg-[#fcf9fb] p-3 text-sm text-[#4d394e]"
                value={extractedData.structured_data.doctor_name || ''}
                onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, doctor_name: e.target.value}})}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#765f71]">Medicines</label>
              <textarea 
                className="mt-1 w-full rounded-xl border border-[#f0e2e8] bg-[#fcf9fb] p-3 text-sm text-[#4d394e] min-h-[60px]"
                value={(extractedData.structured_data.medicines || []).join(', ')}
                onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, medicines: e.target.value.split(',').map((s: string) => s.trim())}})}
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#765f71]">Notes / Other findings</label>
              <textarea 
                className="mt-1 w-full rounded-xl border border-[#f0e2e8] bg-[#fcf9fb] p-3 text-sm text-[#4d394e] min-h-[80px]"
                value={extractedData.structured_data.notes || ''}
                onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, notes: e.target.value}})}
              />
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setExtractedData(null)}
                className="flex-1 rounded-full border border-[#f0e2e8] bg-white py-3 text-sm font-semibold text-[#8c7487] hover:bg-[#faf7f9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-full bg-[#5d4662] py-3 text-sm font-semibold text-white shadow-md hover:bg-[#4a364e]"
              >
                Confirm & Save
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
    </AppShell>
  );
}`;
code = code.replace(/<\/div>\s*<\/AppShell>\s*\);\s*\}/, modalAdditions);

fs.writeFileSync(path, code);

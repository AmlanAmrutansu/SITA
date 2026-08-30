const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

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
                onChange={e => setExtractedData({...extractedData, structured_data: {...extractedData.structured_data, medicines: e.target.value.split(',').map((s) => s.trim())}})}
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
    </AppShell>
  );
}`;

const sitaPageIdx = code.indexOf('export function SitaPage() {');
if (sitaPageIdx !== -1) {
  const nextExportIdx = code.indexOf('export function ', sitaPageIdx + 10);
  const sitaPageCode = nextExportIdx !== -1 ? code.substring(sitaPageIdx, nextExportIdx) : code.substring(sitaPageIdx);
  
  // Replace the closing tags for SitaPage
  const newSitaPageCode = sitaPageCode.replace(/<\/AppShell>\s*\);\s*\}/, modalAdditions);
  
  code = code.substring(0, sitaPageIdx) + newSitaPageCode + (nextExportIdx !== -1 ? code.substring(nextExportIdx) : '');
  
  fs.writeFileSync(path, code);
  console.log("Successfully inserted modal into SitaPage");
}

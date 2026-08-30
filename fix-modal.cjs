const fs = require('fs');
const path = 'artifacts/sita-health/src/pages/sita-pages.tsx';
let code = fs.readFileSync(path, 'utf8');

const modalStart = '{/* Medical Record Review Modal */}';
const modalEnd = '</Modal>';

const startIdx = code.indexOf(modalStart);
if (startIdx !== -1) {
  const endIdx = code.indexOf(modalEnd, startIdx) + modalEnd.length;
  const modalContent = code.substring(startIdx, endIdx);
  
  // Remove it from current location
  code = code.substring(0, startIdx) + code.substring(endIdx);
  
  const sitaPageIdx = code.indexOf('export function SitaPage() {');
  if (sitaPageIdx !== -1) {
    const nextExportIdx = code.indexOf('export function ', sitaPageIdx + 10);
    const sitaPageCode = nextExportIdx !== -1 ? code.substring(sitaPageIdx, nextExportIdx) : code.substring(sitaPageIdx);
    
    // Insert before the last </div></AppShell>
    const newSitaPageCode = sitaPageCode.replace(/<\/div>\s*<\/AppShell>\s*\);\s*\}/, '\n      ' + modalContent + '\n    </div>\n    </AppShell>\n  );\n}');
    
    code = code.substring(0, sitaPageIdx) + newSitaPageCode + (nextExportIdx !== -1 ? code.substring(nextExportIdx) : '');
  }
  
  fs.writeFileSync(path, code);
  console.log("Fixed Modal");
} else {
  console.log("Modal not found");
}

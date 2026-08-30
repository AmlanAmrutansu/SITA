const fs = require('fs');
const path = './artifacts/sita-health/src/pages/welcome-page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace("content = \\`\\${i + 1}\\`;", "content = `${i + 1}`;");
code = code.replace("className={\\`aspect-square rounded-xl border \\${bg} \\${border} flex items-center justify-center text-[10px] sm:text-xs font-semibold \\${textCol} shadow-sm\\`}", "className={`aspect-square rounded-xl border ${bg} ${border} flex items-center justify-center text-[10px] sm:text-xs font-semibold ${textCol} shadow-sm`}");
code = code.replace("animate={{ height: \\`\\${h}%\\` }}", "animate={{ height: `${h}%` }}");

fs.writeFileSync(path, code);

const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', 'utf8');
content = content.replace("type MoodEntry, type ReproductiveMode } from '@/data/mock';", "type MoodEntry, type ReproductiveMode, type Mood } from '@/data/mock';");
content = content.replace(/stress_level/g, "stress");
content = content.replace(/energy_level/g, "energy");
content = content.replace(/sleep_hours/g, "sleep");
fs.writeFileSync('artifacts/sita-health/src/pages/sita-pages.tsx', content);

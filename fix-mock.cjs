const fs = require('fs');
let content = fs.readFileSync('artifacts/sita-health/src/data/mock.ts', 'utf8');

// Remove initialChat and initialMoodEntries
content = content.replace(/export const initialMoodEntries: MoodEntry\[] = \[[\s\S]*?\];/g, '');
content = content.replace(/export const initialChat: ChatMessage\[] = \[[\s\S]*?\];/g, '');

fs.writeFileSync('artifacts/sita-health/src/data/mock.ts', content);

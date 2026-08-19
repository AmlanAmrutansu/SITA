const fetch = require('node-fetch');

async function run() {
  const evaluatePCOS = require('./artifacts/api-server/src/lib/screening').evaluatePCOS;
  console.log(evaluatePCOS({
    irregularCycles: true,
    excessHairGrowth: false,
    persistentAcne: true,
    hairThinning: false,
    weightChallenges: true,
    familyHistory: false,
    pelvicPain: false
  }));
}
run();

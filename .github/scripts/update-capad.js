const fs = require('fs');

// Read stored data
let records = [];
try {
  records = JSON.parse(fs.readFileSync('capad_data.json', 'utf8'));
  console.log(`Loaded ${records.length} records`);
} catch(e) {
  console.log('No capad_data.json found — nothing to update');
  process.exit(0);
}

if (!records.length) { console.log('Empty dataset'); process.exit(0); }

const R = records, N = R.length;
const arr = (nm, vals) => `const ${nm}=[${vals.join(',')}];`;

const jsBlock = [
  arr('DAYS', R.map(r => `'${r.dateLabel}'`)),
  arr('DATES_FULL', R.map(r => `'${r.date}'`)),
  `const N=${N};`,
  arr('ALC',     R.map(r => r.alc)),
  arr('TRR',     R.map(r => r.trr)),
  'const SURPLUS=ALC.map((v,i)=>v-TRR[i]);',
  'const COVERAGE=ALC.map((v,i)=>v/TRR[i]*100);',
  arr('TRADING_LIMIT', R.map(r => Math.round(r.tradingLimit))),
  arr('CAPITAL_RES',   R.map(r => r.capitalRes)),
  `const IMPAIRED=Array(N).fill(${R[0].impaired});`,
  arr('ILLIQUID',   R.map(r => r.illiquid)),
  arr('UNREALISED', R.map(r => r.unrealised)),
  arr('INCOME',     R.map(r => r.income)),
  arr('EXPENSE',    R.map(r => r.expense)),
  'const UNAUD_PNL=INCOME.map((v,i)=>v-EXPENSE[i]);',
  'const PNL_DELTA=UNAUD_PNL.map((v,i)=>i===0?0:v-UNAUD_PNL[i-1]);',
  'const MARGIN=INCOME.map((v,i)=>UNAUD_PNL[i]/v*100);',
  `const BASE_REQ=Array(N).fill(${R[0].baseReq});`,
  arr('LER',      R.map(r => r.ler || 0)),
  arr('POS_RISK', R.map(r => r.posRisk)),
  arr('CP_NON',   R.map(r => r.cpNon)),
  arr('CP_LOANS', R.map(r => r.cpLoans)),
  arr('CP_CTRL',  R.map(r => r.cpCtrl || 0)),
  `const SHAREHOLDERS=Array(N).fill(${R[0].shareholders});`,
  `const RETAINED=Array(N).fill(${R[0].retained});`,
  `const TREASURY=Array(N).fill(${R[0].treasury});`,
  `const DIVIDENDS=Array(N).fill(0);`,
  `const SUB_LOANS=Array(N).fill(${R[0].subloans});`,
].join('\n');

// Patch the dashboard HTML
let html = fs.readFileSync('capad_dashboard_1.html', 'utf8');
const START = '// DATA_START';
const END   = '// DATA_END';
const si = html.indexOf(START);
const ei = html.indexOf(END);

if (si === -1 || ei === -1) {
  console.error('ERROR: Could not find DATA_START / DATA_END markers in capad_dashboard_1.html');
  console.error('Add these two comment lines around the data arrays in the script section');
  process.exit(1);
}

const latest = R[R.length - 1];
const prev   = R.length > 1 ? R[R.length - 2] : latest;
const dateStr = new Date().toLocaleDateString('en-GB', {day:'numeric',month:'long',year:'numeric'});

let patched = html.slice(0, si + START.length) + '\n' + jsBlock + '\n' + html.slice(ei);
patched = patched
  .replace(/\d+ trading days/, `${N} trading days`)
  .replace(/Updated: [\w\s]+2026/, `Updated: ${dateStr}`);

fs.writeFileSync('capad_dashboard_1.html', patched);
console.log(`Done — ${N} days, latest ${latest.date}, ALC R${(latest.alc/1e6).toFixed(1)}M, Coverage ${latest.coverage.toFixed(1)}%`);

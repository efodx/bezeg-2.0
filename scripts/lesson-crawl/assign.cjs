// Prints reviewer assignments `<chapter> <k>/<n>` (about --per examples each) for crawled chapters with a summary.json,
// skipping ones listed in <outDir>/assigned.txt; appends what it prints to that file. Usage: assign.cjs <outDir> [--per 3]
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const per = Number(process.argv[process.argv.indexOf('--per') + 1]) || 3;
const doneFile = path.join(dir, 'assigned.txt');
const done = new Set(fs.existsSync(doneFile) ? fs.readFileSync(doneFile, 'utf8').split('\n').filter(Boolean) : []);
const out = [];
for (const chapter of fs.readdirSync(dir)) {
    const s = path.join(dir, chapter, 'summary.json');
    if (!fs.existsSync(s)) continue;
    const n = Math.max(1, Math.ceil(JSON.parse(fs.readFileSync(s, 'utf8')).examples / per));
    for (let k = 1; k <= n; k++) { const a = `${chapter} ${k}/${n}`; if (!done.has(a)) out.push(a); }
}
fs.appendFileSync(doneFile, out.map(a => a + '\n').join(''));
console.log(out.join('\n'));

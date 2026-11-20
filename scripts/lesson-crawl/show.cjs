// Compact view of one crawled chapter for a reviewer: numbered crawl findings (deduplicated, max 40 lines),
// then the screenshots to review. Usage: node scripts/lesson-crawl/show.cjs <outDir>/<chapter>
const fs = require('fs');
const path = require('path');
// Optional `--part k/n`: only the k-th of n slices of the examples and every n-th inspector screenshot.
const dir = process.argv[2];
const partArg = process.argv[process.argv.indexOf('--part') + 1];
const [part, parts] = process.argv.includes('--part') ? partArg.split('/').map(Number) : [1, 1];
const summary = JSON.parse(fs.readFileSync(path.join(dir, 'summary.json'), 'utf8'));
const size = Math.ceil(summary.results.length / parts);
const mine = new Set(summary.results.slice((part - 1) * size, part * size).map(r => r.id));
summary.results = summary.results.filter(r => mine.has(r.id));
summary.examples = summary.results.length;
summary.inspectorShots = summary.inspectorShots.filter((_, i) => i % parts === part - 1);  // rotate across parts
summary.midShots = Object.fromEntries(Object.entries(summary.midShots || {}).filter(([id]) => mine.has(id)));
const rows = fs.readFileSync(path.join(dir, 'findings.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
    .filter(r => mine.has(r.example));
const seen = new Map();
rows.forEach((r, i) => {
    const key = `${r.kind}|${String(r.detail).replace(/\| after.*$/, '').replace(/\d+/g, '#')}`;
    if (!seen.has(key)) seen.set(key, {...r, n: 0, idx: i + 1});
    seen.get(key).n++;
});
console.log(`CHAPTER ${summary.chapter}: ${summary.examples} examples, ${rows.length} findings`);
console.log('examples: ' + summary.results.map(r => `${r.id.split('.').slice(-2).join('.')}(${r.frames}f)`).join(', '));
console.log('--- crawl findings (line# in findings.jsonl, xN = repeats) ---');
[...seen.values()].filter(r => r.severity !== 'info' || /disabled|inspector-only/.test(r.kind)).slice(0, 40)
    .forEach(r => console.log(`#${r.idx} ${r.severity} ${r.kind} x${r.n} ${r.example.split('.').slice(-2).join('.')} @${r.frame}: ${String(r.detail).slice(0, 170)}${r.shot ? ` [${r.shot}]` : ''}`));
console.log('--- inspector screenshots (once per graph route) ---');
summary.inspectorShots.forEach(s => console.log(s));
console.log('--- mid-lesson screenshots ---');
Object.entries(summary.midShots || {}).forEach(([id, m]) => console.log(`${id.split('.').slice(-2).join('.')} @${m.frame}: ${m.shot}`));

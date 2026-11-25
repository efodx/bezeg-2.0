const fs = require('fs'), p = require('path');
const out = [];
const w = d => { for (const e of fs.readdirSync(d, {withFileTypes: true})) { const f = p.join(d, e.name); if (e.isDirectory()) w(f); else if (f.endsWith('.golden.json')) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); const s = j.states; out.push([j.graph, s.length, s.filter(x => x.rows.length || x.notes.length || x.outputs.length).length]); } } };
w('src/graphs');
const c = {}; out.forEach(o => c[o[1]] = (c[o[1]] || 0) + 1);
console.log('files', out.length, 'states-per-file histogram', JSON.stringify(c));
console.log('no rows/notes/outputs in any state:', out.filter(o => o[2] == 0).map(o => o[0]).join(' '));
console.log('single state:', out.filter(o => o[1] == 1).map(o => o[0]).join(' '));

const p = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const self = new Map(); const dt = p.timeDeltas; const byId = new Map(p.nodes.map(n => [n.id, n]));
p.samples.forEach((id, i) => { const n = byId.get(id); const f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
[...self].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log((v / 1000).toFixed(0).padStart(7), 'ms', k));

const p = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const byId = new Map(p.nodes.map(n => [n.id, n])); const parent = new Map();
p.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
const st = new Map();
p.samples.forEach((id, i) => { const fr = []; let cur = id; while (cur !== undefined) { const f = byId.get(cur).callFrame; fr.push(`${f.functionName || 'anon'}@${f.lineNumber}:${f.columnNumber}`); cur = parent.get(cur); }
  const k = fr.slice(0, 14).join(' < '); st.set(k, (st.get(k) || 0) + (p.timeDeltas[i] || 0)); });
[...st].sort((a, b) => b[1] - a[1]).slice(0, 4).forEach(([k, v]) => console.log((v / 1000).toFixed(0), 'ms:', k, '\n'));

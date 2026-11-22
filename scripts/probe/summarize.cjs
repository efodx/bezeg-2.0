// Summarise probe JSON files into one line per route: node scripts/probe/summarize.cjs <label=file.json>...
const path = require('path');
for (const spec of process.argv.slice(2)) {
  const [label, file] = spec.split('=');
  const j = require(path.resolve(file));
  for (const [r, R] of Object.entries(j.routes)) {
    const A = R.actions, o = [];
    for (const a of ['sliderDrag', 'boardPan', 'pointDrag', 'playThenSliderTouch']) {
      const x = A[a];
      o.push(a.slice(0, 6) + ':' + (!x ? '-' : x.skipped ? 'skip' : `${x.frame.p95}/${x.frame.max}/lt${x.longTasksOver50}/cls${x.cls}` + (x.flicker ? '/fl' + x.flicker : '') + (x.moved === false ? '/nopan' : '')));
    }
    const s = A.lessonWalk && A.lessonWalk.steps;
    if (s) {
      const bk = s.filter(z => z.kind === 'back');
      o.push(`steps ${s.filter(z => z.kind === 'next').length}+${bk.length}b maxGlides ${Math.max(...s.map(z => z.glides))} jumps [${s.filter(z => z.jump).map(z => z.kind + z.step)}] maxFrame ${Math.max(...s.map(z => z.frame.max))} LT>50 ${s.filter(z => z.longTasksOver50).length} maxSettle ${Math.max(...s.map(z => z.settleMs))} maxBack% ${Math.max(0, ...bk.map(z => z.backReturnPct || 0))}`);
    }
    console.log(label, r, o.join(' | '));
  }
}

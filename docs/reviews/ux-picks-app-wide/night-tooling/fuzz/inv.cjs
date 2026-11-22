// Pure invariant checkers. Series: array of {t, v (text), on (bool)} for ONE puck, time-ordered.
const num = s => { const n = parseFloat(String(s).replace('\u2212', '-').replace(',', '.')); return isNaN(n) ? null : n; };
// I2: A->B->A (A!=B by text) within 300 ms; exempt a sweeping turning point: puck on, B within 10% of the swing's
// edge (min/max seen so far in the series) AND the step |A-B| is a normal sweep step (<=15% of the swing).
function checkI2(series, hint) {
    const ch = []; // value changes
    for (const s of series) if (!ch.length || ch[ch.length - 1].v !== s.v) ch.push(s);
    for (let j = 1; j + 1 < ch.length; j++) {
        const a = ch[j - 1], b = ch[j], c = ch[j + 1];
        if (a.v !== c.v || a.v === b.v || c.t - a.t > 300) continue;
        const seen = series.filter(s => s.t <= c.t).map(s => num(s.v)).filter(x => x !== null);
        const mn = Math.min(...seen, hint ? hint.mn : Infinity), mx = Math.max(...seen, hint ? hint.mx : -Infinity), sw = mx - mn;
        const A = num(a.v), B = num(b.v);
        const sweeping = a.on && b.on && c.on;
        if (sweeping && sw > 0 && A !== null && B !== null) {
            const edge = Math.min(Math.abs(B - mn), Math.abs(B - mx)) <= 0.1 * sw;
            if (edge && Math.abs(A - B) <= 0.15 * sw) continue;
        }
        return {at: b.t, a: a.v, b: b.v, window: ch.slice(Math.max(0, j - 3), j + 4).map(x => x.v).join(' ')};
    }
    return null;
}
// I1: samples with t >= t0+100 .. t0+1000: never on, value constant (= typed if given, tolerance 0.06).
function checkI1(series, t0, typed) {
    const w = series.filter(s => s.t >= t0 + 100 && s.t <= t0 + 1000);
    if (!w.length) return null;
    const v0 = w[0].v;
    for (const s of w) {
        if (s.on) return {why: '∿ pressed after learner write', at: s.t - t0, v: s.v};
        if (s.v !== v0) return {why: `value moved ${v0} -> ${s.v}`, at: s.t - t0, v: s.v};
    }
    if (typed != null) { const n = num(v0); if (n !== null && Math.abs(n - typed) > 0.06) return {why: `typed ${typed} shows ${v0}`, at: 0, v: v0}; }
    return null;
}
// I3: after Escape: no ∿ pressed and constant values from t0+150 for the series.
function checkI3(series, t0) {
    const w = series.filter(s => s.t >= t0 + 150 && s.t <= t0 + 1150);
    if (!w.length) return null;
    for (const s of w) {
        if (s.on) return {why: '∿ still pressed after Escape', at: s.t - t0, v: s.v};
        if (s.v !== w[0].v) return {why: `value moved ${w[0].v} -> ${s.v} after Escape`, at: s.t - t0, v: s.v};
    }
    return null;
}
// I5: series untouched (never on, not written): value text constant across the whole window.
function checkI5(series) {
    if (series.some(s => s.on)) return null;
    for (const s of series) if (s.v !== series[0].v) return {why: `untouched value moved ${series[0].v} -> ${s.v}`, at: s.t, v: s.v};
    return null;
}
module.exports = {num, checkI1, checkI2, checkI3, checkI5};
if (require.main === module || process.argv.includes('--selftest')) {
    const mk = (str, on) => str.split(' ').map((v, i) => ({t: i * 30, v, on}));
    const pre = '−1,4 1,1 1,1 −1,2 1,1 1,1 −1 1,1 1,1 −1,3 1,1';
    const post = '1,1 1,1 1,2 1,3 1,4 1,5 1,6 1,7 1,8 1,9 2 2 1,9 1,8';
    const r1 = checkI2(mk(pre, true)), r2 = checkI2(mk(post, true));
    console.log('pre-fix  (must FAIL I2):', r1 ? 'FAIL as expected: ' + JSON.stringify(r1) : 'PASSED (BAD)');
    console.log('post-fix (must PASS I2):', r2 ? 'FAILED (BAD): ' + JSON.stringify(r2) : 'PASS as expected');
    // also unflagged-on version of pre-fix
    const r3 = checkI2(mk(pre, false));
    console.log('pre-fix, ∿ unpressed (must FAIL):', r3 ? 'FAIL as expected' : 'PASSED (BAD)');
    process.exit(r1 && !r2 && r3 ? 0 : 1);
}

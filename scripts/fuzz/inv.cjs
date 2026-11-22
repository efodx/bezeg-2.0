// Pure invariant checkers for the interaction fuzzer (docs/specs/parameter-writes.md, acceptance 4).
// A series is a time-ordered array of {t, v (text), on (bool)} for ONE control; `on` means "this control is being played".
const num = s => { const n = parseFloat(String(s).replace('−', '-').replace(',', '.')); return isNaN(n) ? null : n; };

// I2: A->B->A (A!=B by text) within 300 ms. A sweeping turning point is exempt: control playing, B within 10% of the
// swing's edge (min/max seen so far, plus `hint`) and the step |A-B| is a normal sweep step (<=15% of the swing).
function checkI2(series, hint) {
    const ch = [];
    for (const s of series) if (!ch.length || ch[ch.length - 1].v !== s.v) ch.push(s);
    for (let j = 1; j + 1 < ch.length; j++) {
        const a = ch[j - 1], b = ch[j], c = ch[j + 1];
        if (a.v !== c.v || a.v === b.v || c.t - a.t > 300) continue;
        const seen = series.filter(s => s.t <= c.t).map(s => num(s.v)).filter(x => x !== null);
        const mn = Math.min(...seen, hint ? hint.mn : Infinity), mx = Math.max(...seen, hint ? hint.mx : -Infinity), sw = mx - mn;
        const A = num(a.v), B = num(b.v);
        if (a.on && b.on && c.on && sw > 0 && A !== null && B !== null) {
            const edge = Math.min(Math.abs(B - mn), Math.abs(B - mx)) <= 0.1 * sw;
            if (edge && Math.abs(A - B) <= 0.15 * sw) continue;
        }
        return {at: b.t, a: a.v, b: b.v, window: ch.slice(Math.max(0, j - 3), j + 4).map(x => x.v).join(' ')};
    }
    return null;
}
// I1: learner wins. Samples in t0+100 .. t0+1000: never playing, value constant (= typed if given, tolerance 0.06).
function checkI1(series, t0, typed) {
    const w = series.filter(s => s.t >= t0 + 100 && s.t <= t0 + 1000);
    if (!w.length) return null;
    const v0 = w[0].v;
    for (const s of w) {
        if (s.on) return {why: 'playback running after learner write', at: s.t - t0, v: s.v};
        if (s.v !== v0) return {why: `value moved ${v0} -> ${s.v}`, at: s.t - t0, v: s.v};
    }
    if (typed != null) { const n = num(v0); if (n !== null && Math.abs(n - typed) > 0.06) return {why: `typed ${typed} shows ${v0}`, at: 0, v: v0}; }
    return null;
}
// I3: Esc stills everything. From t0+200 (200 ms after Esc) for one second: nothing playing, value constant.
function checkI3(series, t0) {
    const w = series.filter(s => s.t >= t0 + 200 && s.t <= t0 + 1200);
    if (!w.length) return null;
    for (const s of w) {
        if (s.on) return {why: 'playback still running after Escape', at: s.t - t0, v: s.v};
        if (s.v !== w[0].v) return {why: `value moved ${w[0].v} -> ${s.v} after Escape`, at: s.t - t0, v: s.v};
    }
    return null;
}
// I5: untouched parameters stay. A series the step never wrote and never played holds one value over the whole window.
function checkI5(series) {
    if (series.some(s => s.on)) return null;
    for (const s of series) if (s.v !== series[0].v) return {why: `untouched value moved ${series[0].v} -> ${s.v}`, at: s.t, v: s.v};
    return null;
}
module.exports = {num, checkI1, checkI2, checkI3, checkI5};

function selftest() {
    const mk = (str, on, dt = 30) => str.split(' ').map((v, i) => ({t: i * dt, v, on}));
    const results = [];
    const expect = (name, got, wantFail) => { const ok = wantFail ? !!got : !got; results.push(ok); console.log(`${ok ? 'ok  ' : 'BAD '} ${name}: ${got ? 'FAIL ' + JSON.stringify(got) : 'pass'} (expected ${wantFail ? 'FAIL' : 'pass'})`); };
    const flicker = '-1,4 1,1 1,1 -1,2 1,1 1,1 -1 1,1 1,1 -1,3 1,1';
    const sweep = '1,1 1,1 1,2 1,3 1,4 1,5 1,6 1,7 1,8 1,9 2 2 1,9 1,8';
    expect('I2 probe flicker', checkI2(mk(flicker, true)), true);
    expect('I2 probe flicker, not playing', checkI2(mk(flicker, false)), true);
    expect('I2 clean sweep turning point', checkI2(mk(sweep, true)), false);
    // I1: the learner set 3; a stale write puts 2 back after 150 ms (series sampled every 30 ms from t0 = 0).
    const stale = '3 3 3 3 3 3 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2 2';
    expect('I1 stale write wins', checkI1(mk(stale, false), 0, 3), true);
    expect('I1 playback after write', checkI1(mk('3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3', true), 0), true);
    expect('I1 learner value stays', checkI1(mk('3 '.repeat(40).trim(), false), 0, 3), false);
    expect('I1 typed value differs', checkI1(mk('2,5 '.repeat(40).trim(), false), 0, 3), true);
    expect('I3 value moves after Esc', checkI3(mk('1 1 1 1 1 1 1 1 1 1 1 1 1 1 2 2 2 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3 3', false), 0), true);
    expect('I3 still after Esc', checkI3(mk('1 '.repeat(40).trim(), false), 0), false);
    expect('I5 untouched value moves', checkI5(mk('1 1 1 1 2 2 2', false)), true);
    expect('I5 untouched value stays', checkI5(mk('1 1 1 1 1 1', false)), false);
    expect('I5 playing parameter exempt', checkI5(mk('1 1 1 1 2 2 2', true)), false);
    return results.every(Boolean);
}
module.exports.selftest = selftest;
if (require.main === module) process.exit(selftest() ? 0 : 1);

import {G} from './descentTime';
import {bezierTrack} from './tracks';
import {
    beadParameter, checkField, DEFAULT_DESCENT_STATE, deriveDescent, deriveRace, deriveTautochrone, deriveTrack, FIELD_RANGES, NUMERIC_FIELDS,
    parseDescentState, roundUpTime, serializeDescentState, snapDrag, THETA_STEP, type DescentState,
} from './trackModel';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
const withState = (patch: Partial<DescentState>): DescentState => ({...DEFAULT_DESCENT_STATE, ...patch});

/** Test-side composite Simpson rule, independent of the kernel's Gauss-Legendre. */
function simpson(f: (x: number) => number, a: number, b: number, panels: number): number {
    const h = (b - a) / (2 * panels);
    let sum = f(a) + f(b);
    for (let i = 1; i < 2 * panels; i++) sum += (i % 2 === 1 ? 4 : 2) * f(a + i * h);
    return (sum * h) / 3;
}

/** The cubic Bezier written out as a polynomial, independent of `bezierTrack`. */
function cubic(p: readonly (readonly [number, number])[]) {
    const at = (t: number, k: 0 | 1) => (1 - t) ** 3 * p[0][k] + 3 * t * (1 - t) ** 2 * p[1][k] + 3 * t * t * (1 - t) * p[2][k] + t ** 3 * p[3][k];
    const d = (t: number, k: 0 | 1) => 3 * ((1 - t) ** 2 * (p[1][k] - p[0][k]) + 2 * t * (1 - t) * (p[2][k] - p[1][k]) + t * t * (p[3][k] - p[2][k]));
    return {at, d};
}

/** Time of a cubic track by the substitution t = s^4 and Simpson, all in the test. */
function cubicTimeS4(p: readonly (readonly [number, number])[]): number {
    const {at, d} = cubic(p);
    const f = (s: number) => {
        if (s === 0) return 0;
        const t = s ** 4;
        return (4 * s ** 3 * Math.hypot(d(t, 0), d(t, 1))) / Math.sqrt(2 * G * at(t, 1));
    };
    return simpson(f, 0, 1, 4000);
}

describe('strict checks of stored numbers', () => {
    test('a value on the grid and inside the range is stored as given', () => {
        expect(checkField('endX', 3.25)).toEqual({ok: true, value: 3.25});
        expect(checkField('p1y', -0.5)).toEqual({ok: true, value: -0.5});
        expect(checkField('theta1', 0.3)).toEqual({ok: true, value: 0.3});
        expect(checkField('radius', 3)).toEqual({ok: true, value: 3});
    });

    test.each([
        ['endX', 3.3, 'off-grid'], ['endX', 0, 'out-of-range'], ['endX', 6.25, 'out-of-range'], ['p1y', -2.25, 'out-of-range'],
        ['radius', 0.1, 'out-of-range'], ['theta1', 3.15, 'out-of-range'], ['theta2', 0.33, 'off-grid'], ['theta3', Math.PI - 1e-6, 'out-of-range'],
        ['endY', Number.NaN, 'not-finite'], ['endY', Infinity, 'not-finite'], ['endY', '2', 'not-finite'], ['endY', undefined, 'missing'],
    ] as const)('%s = %s is refused as %s and nothing is rounded or clamped', (field, value, reason) => {
        const result = checkField(field, value);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error.reason).toBe(reason);
            expect(result.error.field).toBe(field);
            expect(result.error.message).toContain(field);
        }
    });

    test('the lowest point theta = pi is the one value off the 0.05 grid that is stored, exactly', () => {
        expect(checkField('theta1', Math.PI)).toEqual({ok: true, value: Math.PI});
        expect(checkField('p1x', Math.PI).ok).toBe(false);
        expect(checkField('theta1', 3.1)).toEqual({ok: true, value: 3.1});
    });

    test('a grid product with binary noise is stored clean', () => {
        const result = checkField('theta1', 0.05 * 3);
        expect(result).toEqual({ok: true, value: 0.15});
    });
});

describe('Preset round trip', () => {
    test('serialize then parse returns the same state, for every mode', () => {
        for (const mode of ['race', 'track', 'tautochrone'] as const) {
            const state = withState({mode, endX: 4.5, p2y: -1.25, theta3: Math.PI, showArc: true, showCycloid: false});
            const parsed = parseDescentState(JSON.parse(JSON.stringify(serializeDescentState(state))));
            expect(parsed).toEqual({ok: true, value: state});
        }
    });

    test('derived or unknown fields in a Preset are dropped, not stored', () => {
        const parsed = parseDescentState({...DEFAULT_DESCENT_STATE, time: 0.5, elapsed: 1, winner: 'line'});
        expect(parsed.ok).toBe(true);
        if (parsed.ok) expect(Object.keys(parsed.value).sort()).toEqual(Object.keys(DEFAULT_DESCENT_STATE).sort());
    });

    test.each([
        [null, 'state', 'not-an-object'], [[], 'state', 'not-an-object'], [{...DEFAULT_DESCENT_STATE, mode: undefined}, 'mode', 'missing'],
        [{...DEFAULT_DESCENT_STATE, mode: 'race2'}, 'mode', 'unknown-value'], [{...DEFAULT_DESCENT_STATE, endX: 3.3}, 'endX', 'off-grid'],
        [{...DEFAULT_DESCENT_STATE, p1y: 5}, 'p1y', 'out-of-range'], [{...DEFAULT_DESCENT_STATE, radius: null}, 'radius', 'missing'],
        [{...DEFAULT_DESCENT_STATE, showArc: 1}, 'showArc', 'not-boolean'], [{...DEFAULT_DESCENT_STATE, showCycloid: undefined}, 'showCycloid', 'missing'],
    ])('malformed data %#: the first problem is named with an actionable message', (data, field, reason) => {
        const parsed = parseDescentState(data);
        expect(parsed.ok).toBe(false);
        if (!parsed.ok) {
            expect(parsed.error).toMatchObject({field, reason});
            expect(parsed.error.message.length).toBeGreaterThan(10);
        }
    });

    test('an imported off-grid value is never snapped: the whole state is refused', () => {
        expect(parseDescentState({...DEFAULT_DESCENT_STATE, p2x: 2.1}).ok).toBe(false);
    });
});

describe('drag snapping', () => {
    test('snaps to the nearest quarter and stays inside the range', () => {
        expect(snapDrag('endX', 3.37)).toBe(3.25);
        expect(snapDrag('endX', 3.38)).toBe(3.5);
        expect(snapDrag('endX', -4)).toBe(0.25);
        expect(snapDrag('endX', 99)).toBe(6);
        expect(snapDrag('p1y', -9)).toBe(-2);
        expect(snapDrag('p1y', Number.NaN)).toBe(-2);
    });

    test('a start parameter snaps to 0.05 and to pi near the lowest point; every result passes the strict check', () => {
        expect(snapDrag('theta1', 0.321)).toBe(0.3);
        expect(snapDrag('theta1', 3.12)).toBe(3.1);
        expect(snapDrag('theta1', 3.13)).toBe(Math.PI);
        expect(snapDrag('theta1', 4)).toBe(Math.PI);
        for (let x = -1; x < 7; x += 0.0173) {
            for (const field of NUMERIC_FIELDS) expect(checkField(field, snapDrag(field, x)).ok, `${field} ${x}`).toBe(true);
        }
        expect(THETA_STEP).toBe(0.05);
    });
});

describe('the race (MC1)', () => {
    const race = deriveRace(1);

    test('the cycloid and the line agree with their closed forms to 1e-12', () => {
        expect(rel(race.times.cycloid, Math.PI * Math.sqrt(1 / G))).toBeLessThan(1e-12);
        expect(rel(race.times.line, Math.sqrt(Math.PI ** 2 + 4) / Math.sqrt(G))).toBeLessThan(1e-12);
    });

    test('the listed numbers: 1,00303 s, 1,18904 s, 1,02848 s; the line is 18,54 % slower; the cycloid wins', () => {
        expect(race.times.cycloid).toBeCloseTo(1.00303, 5);
        expect(race.times.line).toBeCloseTo(1.18904, 5);
        expect(race.times.arc).toBeCloseTo(1.02848, 5);
        expect(race.lineSlowerPercent).toBeCloseTo(18.54, 2);
        expect(race.winner).toBe('cycloid');
        expect(race.end[0]).toBeCloseTo(3.14159, 5);
        expect(race.end[1]).toBe(2);
        expect(race.arcSweep * (180 / Math.PI)).toBeCloseTo(115.04, 2);
        expect(race.arcCentre).toBeCloseTo(2.20742, 5);
    });

    test('the arc agrees to 1e-9 with a second quadrature in the angle (Simpson, 2000 panels, phi = u^2 written in the test)', () => {
        const c = race.arcCentre;
        const f = (u: number) => (u === 0 ? 2 : (2 * u) / Math.sqrt(Math.sin(u * u)));
        const reference = Math.sqrt(c / (2 * G)) * simpson(f, 0, Math.sqrt(race.arcSweep), 2000);
        expect(Math.abs(race.times.arc - reference)).toBeLessThan(1e-9);
    });

    test('the arc starts vertically at A, passes below B and ends at B', () => {
        const arc = race.tracks.arc;
        expect(arc.point(0)[0]).toBeCloseTo(0, 12);
        expect(arc.point(0)[1]).toBeCloseTo(0, 12);
        expect(arc.velocity(0)[0]).toBeCloseTo(0, 12);
        expect(arc.point(1)[0]).toBeCloseTo(Math.PI, 12);
        expect(arc.point(1)[1]).toBeCloseTo(2, 12);
        const deepest = Math.max(...Array.from({length: 201}, (_, i) => arc.y(i / 200)));
        expect(deepest).toBeCloseTo(race.arcCentre, 4);
        expect(deepest).toBeGreaterThan(2);
    });

    test.each([0.25, 0.5, 1.75, 3])('r = %s: the times scale as sqrt(r) to 1e-12 relative and the order is unchanged', r => {
        const scaled = deriveRace(r);
        const k = Math.sqrt(r);
        expect(rel(scaled.times.cycloid, race.times.cycloid * k)).toBeLessThan(1e-12);
        expect(rel(scaled.times.line, race.times.line * k)).toBeLessThan(1e-12);
        expect(rel(scaled.times.arc, race.times.arc * k)).toBeLessThan(1e-9);
        expect(scaled.winner).toBe('cycloid');
        expect(scaled.times.cycloid).toBeLessThan(scaled.times.arc);
        expect(scaled.times.arc).toBeLessThan(scaled.times.line);
    });

    test('the end of the slider rounds the slowest time up on the 0,01 s grid', () => {
        expect(race.tEnd).toBe(1.19);
        expect(roundUpTime(1.18904)).toBe(1.19);
        expect(roundUpTime(1.19)).toBe(1.19);
        expect(roundUpTime(0.0001)).toBe(0.01);
    });
});

describe('the track mode (MC2)', () => {
    const state = withState({mode: 'track'});
    const track = deriveTrack(state);

    test('the cycloid through A and B: theta_B, r and T of the listed numbers', () => {
        expect(track.cycloid.theta).toBeCloseTo(3.194665, 6);
        expect(track.cycloid.r).toBeCloseTo(1.000704, 6);
        expect(track.cycloid.time).toBeCloseTo(1.02034, 5);
        expect(track.cycloid.time).toBeCloseTo(track.cycloid.theta * Math.sqrt(track.cycloid.r / G), 14);
        const end = track.cycloid.track.point(track.cycloid.theta);
        expect(end[0]).toBeCloseTo(3.25, 12);
        expect(end[1]).toBeCloseTo(2, 12);
    });

    test('the straight line takes sqrt(x^2 + y^2) / sqrt(g r) with r = 1, the listed 1,21838 s', () => {
        expect(rel(track.lineTime, Math.sqrt(3.25 ** 2 + 4) / Math.sqrt(G))).toBeLessThan(1e-12);
        expect(track.lineTime).toBeCloseTo(1.21838, 5);
    });

    test('the default track: 1,036620 s, equal to the s^4 substitution written out in the test to 1e-9, 1,6 % above the cycloid', () => {
        expect(track.status).toBe('ok');
        expect(track.time).toBeCloseTo(1.03662, 5);
        const points = [[0, 0], [0.5, 2], [2, 2.5], [3.25, 2]] as const;
        expect(Math.abs(track.time! - cubicTimeS4(points))).toBeLessThan(1e-9);
        expect(track.differencePercent).toBeCloseTo(1.6, 1);
        expect(track.difference).toBeCloseTo(track.time! - track.cycloid.time, 14);
    });

    test('the Bezier track passes through its four control points at the ends and matches the written-out cubic', () => {
        const {at} = cubic(track.controls);
        for (const t of [0, 0.2, 0.5, 0.9, 1]) {
            expect(track.track.point(t)[0]).toBeCloseTo(at(t, 0), 12);
            expect(track.track.point(t)[1]).toBeCloseTo(at(t, 1), 12);
        }
        expect(bezierTrack(track.controls).point(1)).toEqual(track.track.point(1));
    });

    test('a horizontal start (y1 = 0) is "never starts" and a negative control depth is "above start": no time, no difference, no NaN', () => {
        const never = deriveTrack(withState({mode: 'track', p1y: 0}));
        expect(never).toMatchObject({status: 'never-starts', time: undefined, difference: undefined, differencePercent: undefined});
        const above = deriveTrack(withState({mode: 'track', p2y: -0.5}));
        expect(above).toMatchObject({status: 'above-start', time: undefined, difference: undefined});
        for (const d of [never, above]) {
            expect(Number.isFinite(d.cycloid.time)).toBe(true);
            expect(Number.isFinite(d.lineTime)).toBe(true);
            expect(Number.isFinite(d.tEnd)).toBe(true);
        }
    });

    test('a cusp start (P1 = P0) is timed when the next control point is below the start', () => {
        const cusp = deriveTrack(withState({mode: 'track', p1x: 0, p1y: 0}));
        expect(cusp.status).toBe('ok');
        expect(cusp.time).toBeGreaterThan(cusp.cycloid.time);
        expect(Math.abs(cusp.time! - cubicTimeS4([[0, 0], [0, 0], [2, 2.5], [3.25, 2]]))).toBeLessThan(1e-9);
    });

    test('the slider end follows the cycloid overlay; an inadmissible track with the cycloid hidden has no bead and a run of length 0', () => {
        expect(track.tEnd).toBe(roundUpTime(Math.max(track.time!, track.cycloid.time)));
        const hidden = deriveTrack(withState({mode: 'track', showCycloid: false}));
        expect(hidden.tEnd).toBe(roundUpTime(hidden.time!));
        const none = deriveTrack(withState({mode: 'track', showCycloid: false, p1y: 0}));
        expect(none.tEnd).toBe(0);
        expect(deriveTrack(withState({mode: 'track', showCycloid: false, p2y: -0.5})).tEnd).toBe(0);
        // With the cycloid shown, the cycloid is the bead that runs.
        expect(deriveTrack(withState({mode: 'track', showCycloid: true, p1y: 0})).tEnd).toBe(roundUpTime(none.cycloid.time));
    });

    test('3000 seeded random admissible tracks never beat the cycloid (an illustration check of the theorem, not a proof)', () => {
        let seed = 20261110;
        const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
        const pick = (field: keyof typeof FIELD_RANGES) => {
            const r = FIELD_RANGES[field];
            return r.min + Math.floor(next() * ((r.max - r.min) / r.step + 1)) * r.step;
        };
        let checked = 0;
        for (let i = 0; i < 3000; i++) {
            const d = deriveTrack(withState({mode: 'track', endX: pick('endX'), endY: pick('endY'), p1x: pick('p1x'), p1y: pick('p1y'), p2x: pick('p2x'), p2y: pick('p2y')}));
            if (d.status !== 'ok') continue;
            checked++;
            expect(d.time! - d.cycloid.time).toBeGreaterThanOrEqual(-1e-9);
            expect(d.difference!).toBeGreaterThanOrEqual(0);
        }
        expect(checked).toBeGreaterThan(1000);
    });
});

describe('the tautochrone (MC3)', () => {
    const state = withState({mode: 'tautochrone'});
    const derived = deriveTautochrone(state);

    test('the three listed starts all reach the lowest point in pi / sqrt(g) to 1e-9, for r = 1', () => {
        const expected = Math.PI / Math.sqrt(G);
        expect(derived.closedForm).toBeCloseTo(expected, 14);
        expect(derived.beads.map(b => b.theta)).toEqual([0.3, 1, 2]);
        for (const bead of derived.beads) {
            expect(bead.status).toBe('ok');
            expect(Math.abs(bead.time - expected)).toBeLessThan(1e-9);
        }
    });

    test('the time is constant over a grid of 60 start parameters within 1e-9, for r = 0.5 and 3 as well', () => {
        for (const radius of [0.5, 1, 3]) {
            const expected = Math.PI * Math.sqrt(radius / G);
            for (let k = 0; k < 60; k++) {
                const theta = k * THETA_STEP;
                const d = deriveTautochrone(withState({mode: 'tautochrone', radius, theta1: theta}));
                expect(Math.abs(d.beads[0].time - expected), `r ${radius} theta ${theta}`).toBeLessThan(1e-9);
            }
        }
    });

    test('the cusp start theta = 0 is timed like the others; theta = pi is already at the bottom: a status and no time', () => {
        const cusp = deriveTautochrone(withState({mode: 'tautochrone', theta1: 0, theta3: Math.PI}));
        expect(cusp.beads[0]).toMatchObject({status: 'ok'});
        expect(Math.abs(cusp.beads[0].time - Math.PI / Math.sqrt(G))).toBeLessThan(1e-9);
        expect(cusp.beads[2]).toMatchObject({status: 'at-bottom', time: 0});
        expect(Number.isFinite(cusp.tEnd)).toBe(true);
    });

    test('the circular arc is absent unless requested, and the three starts keep their depth', () => {
        expect(derived.beads.every(b => b.arc === undefined)).toBe(true);
        expect(derived.arcGuide).toBeUndefined();
        const withArc = deriveTautochrone(withState({mode: 'tautochrone', showArc: true}));
        withArc.beads.forEach(b => {
            expect(b.arc!.start[1]).toBeCloseTo(b.start[1], 12);
            expect(b.arc!.track.point(1)[0]).toBeCloseTo(withArc.bottom[0], 12);
            expect(b.arc!.track.point(1)[1]).toBeCloseTo(withArc.bottom[1], 12);
        });
    });

    test('the arc times differ with the start and agree with the pendulum quarter period sqrt(R / g) K(k), K by the AGM written in the test', () => {
        const withArc = deriveTautochrone(withState({mode: 'tautochrone', showArc: true, theta1: 0, theta2: 1.5}));
        const agm = (a: number, b: number) => { for (let i = 0; i < 30; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)]; return a; };
        const times = withArc.beads.map(b => b.arc!.time);
        withArc.beads.forEach(b => {
            const k = Math.sin(b.arc!.sweep / 2);
            const quarter = Math.sqrt(4 / G) * (Math.PI / (2 * agm(1, Math.sqrt(1 - k * k))));
            expect(Math.abs(b.arc!.time - quarter), `theta ${b.theta}`).toBeLessThan(1e-9);
            expect(b.arc!.time).toBeGreaterThan(Math.PI / Math.sqrt(G) - 1e-12);
        });
        expect(new Set(times.map(v => v.toFixed(4))).size).toBe(3);
        expect(times[0]).toBeGreaterThan(times[1]);
    });

    test('the arc at theta = pi has no start (already at the bottom)', () => {
        const d = deriveTautochrone(withState({mode: 'tautochrone', showArc: true, theta2: Math.PI}));
        expect(d.beads[1].arc).toBeUndefined();
    });
});

describe('the bead position at an elapsed time', () => {
    const race = deriveRace(1);

    test('on the straight line the bead has covered s = g sin(alpha) t^2 / 2 (constant acceleration, closed form in the test)', () => {
        const length = Math.hypot(Math.PI, 2);
        const a = (G * 2) / length;
        for (const t of [0.1, 0.4, 0.8, 1.1]) {
            const u = beadParameter(race.tracks.line, 0, t);
            expect(Math.abs(u - (0.5 * a * t * t) / length), `t ${t}`).toBeLessThan(1e-9);
        }
    });

    test('on the cycloid from the cusp the angle is theta = t sqrt(g / r)', () => {
        for (const radius of [0.5, 1, 2.5]) {
            const d = deriveRace(radius);
            for (const frac of [0.1, 0.5, 0.9]) {
                const t = frac * d.times.cycloid;
                expect(Math.abs(beadParameter(d.tracks.cycloid, 0, t) - t * Math.sqrt(G / radius))).toBeLessThan(1e-9);
            }
        }
    });

    test('on the tautochrone the bead follows cos(theta/2) = cos(theta0/2) cos(omega t), omega = sqrt(g / 4r)', () => {
        const radius = 1.25;
        const d = deriveTautochrone(withState({mode: 'tautochrone', radius}));
        const omega = Math.sqrt(G / (4 * radius));
        for (const bead of d.beads) {
            for (const frac of [0.2, 0.5, 0.8]) {
                const t = frac * bead.time;
                const expected = 2 * Math.acos(Math.cos(bead.theta / 2) * Math.cos(omega * t));
                expect(Math.abs(beadParameter(d.cycloid, bead.theta, t) - expected), `theta ${bead.theta} t ${t}`).toBeLessThan(1e-9);
            }
        }
    });

    test('before the start the bead is at the start, from the arrival on it rests at the end', () => {
        expect(beadParameter(race.tracks.arc, 0, 0)).toBe(0);
        expect(beadParameter(race.tracks.arc, 0, -1)).toBe(0);
        expect(beadParameter(race.tracks.arc, 0, race.times.arc)).toBe(1);
        expect(beadParameter(race.tracks.arc, 0, 50)).toBe(1);
    });

    test('energy: on the arc, which dips and rises, the speed is sqrt(2 g y) at every time (central difference of the position)', () => {
        const arc = race.tracks.arc;
        const h = 1e-4;
        for (const frac of [0.1, 0.3, 0.55, 0.8, 0.95]) {
            const t = frac * race.times.arc;
            const at = (time: number) => arc.point(beadParameter(arc, 0, time));
            const [x0, y0] = at(t - h);
            const [x1, y1] = at(t + h);
            const speed = Math.hypot(x1 - x0, y1 - y0) / (2 * h);
            const depth = at(t)[1];
            expect(rel(speed, Math.sqrt(2 * G * depth)), `t ${t}`).toBeLessThan(1e-5);
        }
    });

    test('the arc bead after the lowest point still rises toward B and the time is monotone in the parameter', () => {
        const arc = race.tracks.arc;
        const parameters = Array.from({length: 40}, (_, i) => beadParameter(arc, 0, (race.times.arc * (i + 1)) / 41));
        for (let i = 1; i < parameters.length; i++) expect(parameters[i]).toBeGreaterThan(parameters[i - 1]);
    });
});

describe('the dispatch', () => {
    test('deriveDescent picks the derivation of the stored mode and the default state is a valid state', () => {
        expect(parseDescentState(DEFAULT_DESCENT_STATE).ok).toBe(true);
        expect(deriveDescent(withState({mode: 'race'})).mode).toBe('race');
        expect(deriveDescent(withState({mode: 'track'})).mode).toBe('track');
        expect(deriveDescent(withState({mode: 'tautochrone'})).mode).toBe('tautochrone');
    });

    test('every derivation over the corners of the ranges is finite', () => {
        for (const field of NUMERIC_FIELDS) {
            for (const value of [FIELD_RANGES[field].min, FIELD_RANGES[field].max]) {
                for (const mode of ['race', 'track', 'tautochrone'] as const) {
                    const d = deriveDescent(withState({mode, [field]: value, showArc: true}));
                    expect(Number.isFinite(d.tEnd), `${mode} ${field} ${value}`).toBe(true);
                    expect(d.tEnd).toBeGreaterThan(0);
                }
            }
        }
    });
});

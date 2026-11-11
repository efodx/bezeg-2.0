import {
    ALPHA_RANGE, arrowEnd, B_RANGE, classificationId, componentVectors, DEFAULT_KINEMATICS_STATE, deriveKinematics, evaluateAt, FIELD_RANGES, GRAVITY,
    type KinematicsState, MOTION_IDS, motionSource, NUMERIC_FIELDS, OMEGA_RANGE, parseKinematicsState, RADIUS_RANGE, SAMPLES, serializeKinematicsState,
    snapField, timeEnd, V0_RANGE, withMotion,
} from './kinematicsModel';

const state = (patch: Partial<KinematicsState> = {}): KinematicsState => ({...DEFAULT_KINEMATICS_STATE, ...patch});
const projectile = (v0 = 20, alpha = 45) => state({motion: 'projectile', v0, alpha});
const circle = (radius: number, omega: number, b = 0) => state({motion: 'circular', radius, omega, b});
const regular = (s: KinematicsState, t: number) => {
    const e = evaluateAt(deriveKinematics(s), t);
    if (e.kind !== 'regular') throw new Error(`expected a regular point at t=${t}`);
    return e;
};

describe('Preset round trip', () => {
    test('every motion round trips through JSON and the default is valid', () => {
        for (const motion of MOTION_IDS) {
            const s = withMotion(state({v0: 12, alpha: 60, radius: 3.5, omega: 2.75, b: 0.35}), motion);
            const parsed = parseKinematicsState(JSON.parse(JSON.stringify(serializeKinematicsState(s))));
            expect(parsed).toEqual({ok: true, value: s});
        }
        expect(parseKinematicsState(DEFAULT_KINEMATICS_STATE).ok).toBe(true);
    });

    test('time, the playing flag and derived fields in a Preset are dropped, not stored', () => {
        const parsed = parseKinematicsState({...DEFAULT_KINEMATICS_STATE, time: 1.5, playing: true, speed: 3, range: 40});
        expect(parsed.ok && Object.keys(parsed.value).sort()).toEqual(Object.keys(DEFAULT_KINEMATICS_STATE).sort());
        expect(Object.keys(serializeKinematicsState(state())).join()).not.toMatch(/time|playing/);
    });

    test('a stepper product with binary noise is stored clean (b = 0.15 is 0.15)', () => {
        const parsed = parseKinematicsState(state({motion: 'circular', b: 0.05 * 3}));
        expect(parsed.ok && parsed.value.b).toBe(0.15);
    });

    test.each([
        ['null', null, 'state', 'not-an-object'],
        ['an array', [], 'state', 'not-an-object'],
        ['no motion', {...DEFAULT_KINEMATICS_STATE, motion: undefined}, 'motion', 'missing'],
        ['unknown motion', {...DEFAULT_KINEMATICS_STATE, motion: 'pendulum'}, 'motion', 'unknown-value'],
        ['missing alpha', {...DEFAULT_KINEMATICS_STATE, alpha: undefined}, 'alpha', 'missing'],
        ['alpha as text', {...DEFAULT_KINEMATICS_STATE, alpha: '45'}, 'alpha', 'not-finite'],
        ['alpha NaN', {...DEFAULT_KINEMATICS_STATE, alpha: NaN}, 'alpha', 'not-finite'],
        ['alpha infinite', {...DEFAULT_KINEMATICS_STATE, alpha: Infinity}, 'alpha', 'not-finite'],
        ['alpha below the stepper end', {...DEFAULT_KINEMATICS_STATE, alpha: 0}, 'alpha', 'out-of-range'],
        ['alpha above the stepper end', {...DEFAULT_KINEMATICS_STATE, alpha: 90}, 'alpha', 'out-of-range'],
        ['alpha off the grid', {...DEFAULT_KINEMATICS_STATE, alpha: 47}, 'alpha', 'off-grid'],
        ['v0 off the grid', {...DEFAULT_KINEMATICS_STATE, v0: 20.5}, 'v0', 'off-grid'],
        ['radius off the grid', {...DEFAULT_KINEMATICS_STATE, radius: 1.2}, 'radius', 'off-grid'],
        ['omega off the grid', {...DEFAULT_KINEMATICS_STATE, omega: 1.1}, 'omega', 'off-grid'],
        ['omega too small', {...DEFAULT_KINEMATICS_STATE, omega: 0.25}, 'omega', 'out-of-range'],
        ['b near 1', {...DEFAULT_KINEMATICS_STATE, motion: 'circular', b: 0.95}, 'b', 'out-of-range'],
        ['b equal to 1', {...DEFAULT_KINEMATICS_STATE, motion: 'circular', b: 1}, 'b', 'out-of-range'],
        ['negative b', {...DEFAULT_KINEMATICS_STATE, motion: 'circular', b: -0.05}, 'b', 'out-of-range'],
        ['b with the projectile', {...DEFAULT_KINEMATICS_STATE, motion: 'projectile', b: 0.5}, 'b', 'inconsistent'],
        ['b with a catalogue curve', {...DEFAULT_KINEMATICS_STATE, b: 0.5}, 'b', 'inconsistent'],
        ['trace as a number', {...DEFAULT_KINEMATICS_STATE, trace: 1}, 'trace', 'not-boolean'],
        ['split missing', {...DEFAULT_KINEMATICS_STATE, split: undefined}, 'split', 'missing'],
    ])('%s is refused with the field and the reason', (_name, data, field, reason) => {
        const parsed = parseKinematicsState(data);
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.error).toMatchObject({field, reason});
        expect(parsed.error.message.length).toBeGreaterThan(10);
    });

    test('the stepper ends are valid', () => {
        for (const field of NUMERIC_FIELDS) {
            const {min, max} = FIELD_RANGES[field];
            for (const value of [min, max]) {
                const motion = field === 'b' ? 'circular' : 'cycloid';
                expect(parseKinematicsState({...DEFAULT_KINEMATICS_STATE, motion, [field]: value}).ok).toBe(true);
            }
        }
    });
});

describe('typed input is rounded to the grid and never clamped', () => {
    test.each([
        ['alpha', 47, 45], ['alpha', 47.5, 50], ['alpha', 5, 5], ['alpha', 85, 85], ['v0', 12.4, 12], ['v0', 30, 30], ['radius', 1.3, 1.5], ['radius', 4, 4],
        ['omega', 1.1, 1], ['omega', 1.13, 1.25], ['omega', 0.5, 0.5], ['b', 0.1500000001, 0.15], ['b', 0.9, 0.9], ['b', 0.62, 0.6], ['b', 0, 0],
    ] as const)('%s %f is stored as %f', (field, input, stored) => {
        expect(snapField(field, input)).toEqual({ok: true, value: stored});
    });

    test.each([
        ['alpha', 90], ['alpha', 2], ['alpha', -5], ['v0', 4], ['v0', 31], ['radius', 0.25], ['radius', 4.5], ['omega', 4.25], ['omega', 0.2], ['b', 0.95], ['b', 1], ['b', -0.05],
        ['alpha', NaN], ['b', Infinity],
    ] as const)('%s %f is refused (no clamped value is offered)', (field, input) => {
        const result = snapField(field, input);
        expect(result.ok).toBe(false);
        expect(result).not.toHaveProperty('value');
    });

    test('a motion change resets b unless the motion is circular', () => {
        expect(withMotion(circle(2, 1, 0.5), 'projectile').b).toBe(0);
        expect(withMotion(circle(2, 1, 0.5), 'circular').b).toBe(0.5);
        expect(withMotion(circle(2, 1, 0.5), 'cardioid')).toMatchObject({motion: 'cardioid', b: 0});
    });
});

describe('time domain and classification id', () => {
    test('flight time is 2 v0 sin(alpha) / g, a circle takes its period, the catalogue its arch', () => {
        for (const [v0, alpha] of [[20, 45], [5, 5], [30, 85], [17, 60]] as const) {
            expect(timeEnd(projectile(v0, alpha))).toBeCloseTo(2 * v0 * Math.sin(alpha * Math.PI / 180) / 9.81, 12);
        }
        expect(timeEnd(circle(2, 4))).toBeCloseTo(Math.PI / 2, 12);
        expect(timeEnd(circle(1, 0.5, 0.9))).toBeCloseTo(4 * Math.PI, 12);
        expect(timeEnd(state({motion: 'cycloid'}))).toBeCloseTo(2 * Math.PI, 12);
        expect(timeEnd(state({motion: 'rose'}))).toBeCloseTo(Math.PI, 12);
    });

    test('only the unmodified circular and projectile motions are classified by construction', () => {
        expect(classificationId(circle(2, 1))).toBe('circular');
        expect(classificationId(circle(2, 1, 0.05))).toBe('generic');
        expect(classificationId(projectile())).toBe('projectile');
        expect(classificationId(state({motion: 'cardioid'}))).toBe('generic');
    });
});

describe('the cycloid against its closed forms (independent of decompose)', () => {
    const s = state({motion: 'cycloid'});

    test.each([0.3, 1, Math.PI / 2, 2.5, Math.PI, 4, 5.5, 6.2])('a_T = cos(t/2) and a_N = -sin(t/2) at t = %f', t => {
        const e = regular(s, t);
        expect(e.aT).toBeCloseTo(Math.cos(t / 2), 9);
        expect(e.aN).toBeCloseTo(-Math.sin(t / 2), 9);
        expect(e.speed).toBeCloseTo(2 * Math.sin(t / 2), 9);
        expect(e.aT ** 2 + e.aN ** 2).toBeCloseTo(1, 12);
    });

    test('the numbers of KN5 and KN1', () => {
        const half = regular(s, Math.PI / 2);
        expect([half.speed, half.aT, half.aN, half.kappa, half.kappaSpeedSquared]).toEqual([
            expect.closeTo(1.41421, 5), expect.closeTo(0.70711, 5), expect.closeTo(-0.70711, 5), expect.closeTo(-0.35355, 5), expect.closeTo(-0.70711, 5),
        ]);
        expect(half.point[0]).toBeCloseTo(0.5708, 4);
        expect(half.point[1]).toBeCloseTo(1, 12);
        const top = regular(s, Math.PI);
        expect(top.speed).toBeCloseTo(2, 12);
        expect(Math.abs(top.aT)).toBeLessThan(1e-12);
        expect(top.aN).toBeCloseTo(-1, 12);
        expect(top.kappa).toBeCloseTo(-0.25, 12);
        expect(top.status).toBe('stationary-approx');
        expect(regular(s, 1).aT).toBeCloseTo(0.87758, 5);
        expect(regular(s, 1).speed).toBeCloseTo(0.95885, 5);
    });

    test('the cusp at both ends has a velocity of zero and no components, but its acceleration is nonzero', () => {
        const derived = deriveKinematics(s);
        for (const t of [0, derived.tEnd]) {
            const e = evaluateAt(derived, t);
            expect(e.kind).toBe('singular');
            expect(e).not.toHaveProperty('aT');
            expect(e).not.toHaveProperty('aN');
            expect(e.speed).toBeLessThan(1e-9);
            expect(Math.hypot(e.acceleration[0], e.acceleration[1])).toBeCloseTo(1, 9);
        }
    });

    test('a_T equals the central difference of the speed (step 1e-5)', () => {
        const speed = (t: number) => { const d = motionSource(s).at(t).d1; return Math.hypot(d[0], d[1]); };
        const h = 1e-5;
        for (const t of [0.5, 1.7, 3, 4.4, 5.9]) expect(regular(s, t).aT).toBeCloseTo((speed(t + h) - speed(t - h)) / (2 * h), 8);
    });
});

describe('projectile (spec KN3) against closed forms', () => {
    const s = projectile(20, 45);
    const derived = deriveKinematics(s);

    test('flight data and the position, velocity and speed at t = 1', () => {
        expect(derived.tEnd).toBeCloseTo(2.8832, 4);
        expect(derived.summary?.range).toBeCloseTo(20 * 20 * Math.sin(Math.PI / 2) / 9.81, 12);
        const e = regular(s, 1);
        expect(e.point[0]).toBeCloseTo(14.1421, 4);
        expect(e.point[1]).toBeCloseTo(9.2371, 4);
        expect(e.velocity[0]).toBeCloseTo(14.1421, 4);
        expect(e.velocity[1]).toBeCloseTo(4.3321, 4);
        expect(e.speed).toBeCloseTo(14.7908, 4);
        expect(e.acceleration).toEqual([0, -GRAVITY]);
        expect(e.status).not.toBe('constant-speed');
    });

    test('the sampled path ends on the ground at the closed-form range and peaks at the closed-form height', () => {
        expect(derived.pathX[0]).toBe(0);
        expect(derived.pathY[SAMPLES]).toBeCloseTo(0, 9);
        expect(derived.pathX[SAMPLES]).toBeCloseTo(40.7747, 4);
        expect(derived.box[3]).toBeCloseTo(10.1937, 3);
    });

    test('at the apex the curvature is g / vx^2 and the status is "momentarily stationary"', () => {
        const apex = regular(s, derived.tEnd / 2);
        const vx = 20 * Math.cos(Math.PI / 4);
        // The path bends clockwise, so the signed curvature (left normal) is negative; its size is g / vx^2.
        expect(apex.kappa).toBeCloseTo(-9.81 / (vx * vx), 9);
        expect(apex.status).toBe('stationary-approx');
    });

    test('the status is speeding up after the apex and slowing down before it (sign of a_T = (v . a) / |v|)', () => {
        expect(regular(s, 0.5).status).toBe('slowing-down');
        expect(regular(s, 2.5).status).toBe('speeding-up');
    });

    test('complementary angles have the same range and the same extent', () => {
        const a = deriveKinematics(projectile(20, 30));
        const b = deriveKinematics(projectile(20, 60));
        expect(a.pathX[SAMPLES]).toBeCloseTo(35.3119, 4);
        expect(a.pathX[SAMPLES]).toBeCloseTo(b.pathX[SAMPLES], 9);
    });
});

describe('uniform circular motion (spec KN4)', () => {
    test('speed = omega R, |a| = omega^2 R = v^2 / R, the acceleration points to the centre', () => {
        for (const [R, w] of [[2, 1], [0.5, 0.5], [4, 4], [3.5, 2.25]] as const) {
            const s = circle(R, w);
            const derived = deriveKinematics(s);
            for (const f of [0, 0.1, 0.37, 0.5, 0.9]) {
                const e = regular(s, f * derived.tEnd);
                expect(e.speed).toBeCloseTo(w * R, 9);
                expect(Math.hypot(e.acceleration[0], e.acceleration[1])).toBeCloseTo(w * w * R, 9);
                expect(e.aN).toBeCloseTo(w * w * R, 9);
                expect(Math.abs(e.aT)).toBeLessThan(1e-9);
                // The acceleration passes through the centre: cross product with r is zero.
                expect(Math.abs(e.point[0] * e.acceleration[1] - e.point[1] * e.acceleration[0])).toBeLessThan(1e-9);
                expect(e.status).toBe('constant-speed');
            }
        }
    });

    test('the numbers of the spec: doubling omega gives 4 a, doubling R at the same omega gives 2 v and 2 a', () => {
        const base = regular(circle(2, 1.5), 0.3);
        const faster = regular(circle(2, 3), 0.3);
        const wider = regular(circle(4, 1.5), 0.3);
        expect(faster.aN / base.aN).toBeCloseTo(4, 9);
        expect(wider.speed / base.speed).toBeCloseTo(2, 9);
        expect(wider.aN / base.aN).toBeCloseTo(2, 9);
    });
});

describe('speed variation b on the circle (spec KN2)', () => {
    const s = circle(1, 1, 0.5);
    const derived = deriveKinematics(s);

    test('speed is 1 + b cos t: 1.5, 1, 0.5; curvature is 1 at all three', () => {
        for (const [t, speed] of [[0, 1.5], [Math.PI / 2, 1], [Math.PI, 0.5]] as const) {
            const e = regular(s, t);
            expect(e.speed).toBeCloseTo(speed, 12);
            expect(e.kappa).toBeCloseTo(1, 12);
        }
    });

    test('a_T = -0.5 and a_N = 1 at t = pi/2; a_N = 2.25 at t = 0', () => {
        const quarter = regular(s, Math.PI / 2);
        expect(quarter.aT).toBeCloseTo(-0.5, 12);
        expect(quarter.aN).toBeCloseTo(1, 12);
        expect(regular(s, 0).aN).toBeCloseTo(2.25, 12);
    });

    test('a_T = 0 at t = 0 reads "momentarily stationary", never "constant speed"; b = 0 reads "constant speed"', () => {
        expect(regular(s, 0).status).toBe('stationary-approx');
        expect(regular(circle(1, 1, 0), 0).status).toBe('constant-speed');
        expect(regular(s, Math.PI / 2).status).toBe('slowing-down');
        expect(regular(s, 3 * Math.PI / 2).status).toBe('speeding-up');
    });

    test('the path is the same circle: every point is at distance R from the centre', () => {
        for (let i = 0; i <= SAMPLES; i += 20) expect(Math.hypot(derived.pathX[i], derived.pathY[i])).toBeCloseTo(1, 12);
        const wide = deriveKinematics(circle(3, 2, 0.7));
        for (let i = 0; i <= SAMPLES; i += 20) expect(Math.hypot(wide.pathX[i], wide.pathY[i])).toBeCloseTo(3, 12);
    });

    test('the quarter turn is reached at t = 1.1206, solved by bisection for theta = t + b sin t', () => {
        let lo = 0, hi = Math.PI;
        for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (mid + 0.5 * Math.sin(mid) < Math.PI / 2) lo = mid; else hi = mid; }
        expect(lo).toBeCloseTo(1.1206, 4);
        const e = regular(s, lo);
        expect(e.point[0]).toBeCloseTo(0, 9);
        expect(e.point[1]).toBeCloseTo(1, 9);
    });

    test('with omega != 1 the warp still closes after one period', () => {
        const w = circle(2, 2.5, 0.8);
        const end = deriveKinematics(w);
        const first = evaluateAt(end, 0).point;
        const last = evaluateAt(end, end.tEnd).point;
        expect(last[0]).toBeCloseTo(first[0], 9);
        expect(last[1]).toBeCloseTo(first[1], 9);
    });

    test('the velocity directions of the warped and the uniform circle agree where the points coincide (cross product at most 1e-12)', () => {
        for (const t of [0.4, 1.2, 2.2, 3.1, 4.4]) {
            const warped = regular(s, t);
            // The uniform point at the warped angle: its velocity direction is the tangent there.
            const angle = t + 0.5 * Math.sin(t);
            const tangent = [-Math.sin(angle), Math.cos(angle)];
            expect(Math.abs(warped.velocity[0] * tangent[1] - warped.velocity[1] * tangent[0])).toBeLessThan(1e-12);
        }
    });
});

describe('components, arrows and scales', () => {
    test('the tangential and normal vectors add up to the acceleration and are orthogonal to each other', () => {
        for (const s of [state({motion: 'cardioid'}), state({motion: 'rose'}), state({motion: 'spiral'}), projectile(), circle(2, 1, 0.6)]) {
            const derived = deriveKinematics(s);
            for (const f of [0.13, 0.4, 0.71, 0.93]) {
                const e = evaluateAt(derived, f * derived.tEnd);
                if (e.kind !== 'regular') continue;
                const {tangential, normal} = componentVectors(e);
                expect(tangential[0] + normal[0]).toBeCloseTo(e.acceleration[0], 9);
                expect(tangential[1] + normal[1]).toBeCloseTo(e.acceleration[1], 9);
                expect(Math.abs(tangential[0] * normal[0] + tangential[1] * normal[1])).toBeLessThan(1e-9);
                expect(Math.abs(tangential[0] * e.velocity[1] - tangential[1] * e.velocity[0])).toBeLessThan(1e-9);
                expect(e.aT ** 2 + e.aN ** 2).toBeCloseTo(e.acceleration[0] ** 2 + e.acceleration[1] ** 2, 9);
            }
        }
    });

    test('the scale steps from hand-computed maxima: projectile 20 m/s and 9.81 m/s2 give 20 and 10', () => {
        const p = deriveKinematics(projectile(20, 45));
        expect(p.maxSpeed).toBeCloseTo(20, 9);
        expect(p.maxAcceleration).toBeCloseTo(9.81, 12);
        expect([p.scales.velocity.step, p.scales.acceleration.step]).toEqual([20, 10]);
        const c = deriveKinematics(state({motion: 'cycloid'}));
        expect([c.scales.velocity.step, c.scales.acceleration.step]).toEqual([2, 1]);
        const big = deriveKinematics(circle(4, 4));
        expect([big.scales.velocity.step, big.scales.acceleration.step]).toEqual([20, 100]);
        const small = deriveKinematics(circle(0.5, 0.5));
        expect([small.scales.velocity.step, small.scales.acceleration.step]).toEqual([0.5, 0.2]);
    });

    test.each([...MOTION_IDS])('%s: no drawn arrow is longer than the board length of "length 1"', motion => {
        const s = motion === 'circular' ? circle(3, 2, 0.4) : withMotion(state({motion}), motion);
        const derived = deriveKinematics(s);
        const {velocity, acceleration, unit} = derived.scales;
        for (let i = 0; i <= 200; i++) {
            const e = evaluateAt(derived, derived.tEnd * i / 200);
            const v = arrowEnd(e.point, e.velocity, velocity.step, unit);
            const a = arrowEnd(e.point, e.acceleration, acceleration.step, unit);
            expect(Math.hypot(v[0] - e.point[0], v[1] - e.point[1])).toBeLessThanOrEqual(unit * (1 + 1e-4));
            expect(Math.hypot(a[0] - e.point[0], a[1] - e.point[1])).toBeLessThanOrEqual(unit * (1 + 1e-4));
        }
    });

    test('the scale depends on the motion, not on the time or the display switches; the unit labels are the caller\'s', () => {
        const a = deriveKinematics(state({trace: false, split: true}), 'u1', 'u2');
        const b = deriveKinematics(state());
        expect(a.scales.velocity.step).toBe(b.scales.velocity.step);
        expect(a.scales.velocity.unit).toBe('u1');
        expect(a.scales.acceleration.unit).toBe('u2');
        expect(deriveKinematics(state({motion: 'spiral'})).scales.velocity.step).not.toBe(b.scales.velocity.step);
    });

    test('an arrow of the velocity has the direction of the tangent and the length |v| unit / step', () => {
        const e = regular(state({motion: 'cardioid'}), 1.3);
        const end = arrowEnd(e.point, e.velocity, 2, 0.4);
        expect(Math.hypot(end[0] - e.point[0], end[1] - e.point[1])).toBeCloseTo(e.speed * 0.2, 12);
        expect((end[0] - e.point[0]) * e.velocity[1] - (end[1] - e.point[1]) * e.velocity[0]).toBeCloseTo(0, 12);
    });

    test('evaluateAt refuses a time outside the domain and a non-finite time', () => {
        const derived = deriveKinematics(state());
        expect(() => evaluateAt(derived, -0.1)).toThrow(RangeError);
        expect(() => evaluateAt(derived, derived.tEnd + 0.1)).toThrow(RangeError);
        expect(() => evaluateAt(derived, NaN)).toThrow(RangeError);
    });
});

describe('ranges are the steppers of the spec', () => {
    test('v0 5..30 step 1, alpha 5..85 step 5, R 0.5..4 step 0.5, omega 0.5..4 step 0.25, b 0..0.9 step 0.05', () => {
        expect(V0_RANGE).toEqual({min: 5, max: 30, step: 1});
        expect(ALPHA_RANGE).toEqual({min: 5, max: 85, step: 5});
        expect(RADIUS_RANGE).toEqual({min: 0.5, max: 4, step: 0.5});
        expect(OMEGA_RANGE).toEqual({min: 0.5, max: 4, step: 0.25});
        expect(B_RANGE).toEqual({min: 0, max: 0.9, step: 0.05});
    });
});

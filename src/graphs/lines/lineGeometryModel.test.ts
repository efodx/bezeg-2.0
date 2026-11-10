import {GridPoint} from '../../compgeo/grid';
import {
    DEFAULT_LINE_STATE, deriveLineGeometry, formatExplicit, formatImplicit, formatIntercept, formatTwoPoint, GRID_LIMIT, INTERSECT_TARGETS,
    LINE_MODES, LineGeometryState, lineData, parseLineGeometryState, POINT_FIELDS, serializeLineGeometryState, snapGridInput,
} from './lineGeometryModel';

const state = (patch: Partial<LineGeometryState>): LineGeometryState => ({...DEFAULT_LINE_STATE, ...patch});
const pt = (x: number, y: number): GridPoint => ({x, y});
const text = (r: {format(): string} | undefined) => r?.format();

describe('parse, validate and Preset round trip', () => {
    test('the default state is valid and survives a JSON round trip for every mode and target', () => {
        for (const mode of LINE_MODES) {
            for (const target of INTERSECT_TARGETS) {
                const original = state({mode, target});
                const parsed = parseLineGeometryState(JSON.parse(JSON.stringify(serializeLineGeometryState(original))));
                expect(parsed).toEqual({ok: true, value: original});
            }
        }
        expect(parseLineGeometryState(DEFAULT_LINE_STATE).ok).toBe(true);
    });

    test('derived values are never read from a Preset: extra fields are dropped and the derived numbers come from the points', () => {
        const preset = {
            ...serializeLineGeometryState(DEFAULT_LINE_STATE), implicit: {a: 99, b: 99, c: 99}, foot: {x: 100, y: 100}, distance: 7, angle: 12,
            intersection: {x: 5, y: 5}, tangent: false,
        };
        const parsed = parseLineGeometryState(preset);
        expect(parsed.ok).toBe(true);
        if (!parsed.ok) return;
        expect(Object.keys(parsed.value).sort()).toEqual(['B', 'O', 'P', 'Q', 'R', 'S', 'T', 'mode', 'target']);
        expect(serializeLineGeometryState(parsed.value)).toEqual(serializeLineGeometryState(DEFAULT_LINE_STATE));
        const derived = deriveLineGeometry({...parsed.value, mode: 'distance'});
        expect(text(derived.distance?.foot.x)).toBe('4/5');
        expect(derived.distance?.distance).not.toBe(7);
    });

    test('negative zero is stored as zero', () => {
        const parsed = parseLineGeometryState({...DEFAULT_LINE_STATE, P: {x: -0, y: -0}});
        expect(parsed.ok && Object.is(parsed.value.P.x, 0) && Object.is(parsed.value.P.y, 0)).toBe(true);
    });

    test.each([
        ['a string', 'forms', 'state', 'not-an-object'],
        ['an array', [], 'state', 'not-an-object'],
        ['null', null, 'state', 'not-an-object'],
        ['a missing mode', {...DEFAULT_LINE_STATE, mode: undefined}, 'mode', 'missing'],
        ['an unknown mode', {...DEFAULT_LINE_STATE, mode: 'curve'}, 'mode', 'unknown-value'],
        ['an unknown target', {...DEFAULT_LINE_STATE, target: 'plane'}, 'target', 'unknown-value'],
        ['a missing target', {...DEFAULT_LINE_STATE, target: undefined}, 'target', 'missing'],
        ['a missing point', {...DEFAULT_LINE_STATE, Q: undefined}, 'Q', 'missing'],
        ['a point that is not an object', {...DEFAULT_LINE_STATE, T: 4}, 'T', 'not-an-object'],
        ['a missing coordinate', {...DEFAULT_LINE_STATE, R: {x: 1}}, 'R.y', 'missing'],
        ['a coordinate above 8', {...DEFAULT_LINE_STATE, S: {x: 9, y: 0}}, 'S.x', 'out-of-range'],
        ['a coordinate below -8', {...DEFAULT_LINE_STATE, O: {x: 0, y: -8.5}}, 'O.y', 'out-of-range'],
        ['a fraction', {...DEFAULT_LINE_STATE, B: {x: 1.5, y: 0}}, 'B.x', 'off-grid'],
        ['a string coordinate', {...DEFAULT_LINE_STATE, P: {x: '3', y: 0}}, 'P.x', 'not-finite'],
        ['NaN', {...DEFAULT_LINE_STATE, P: {x: NaN, y: 0}}, 'P.x', 'not-finite'],
        ['Infinity', {...DEFAULT_LINE_STATE, P: {x: 0, y: Infinity}}, 'P.y', 'not-finite'],
    ])('%s is rejected with the field name and an actionable message', (_name, data, field, reason) => {
        const parsed = parseLineGeometryState(data);
        expect(parsed.ok).toBe(false);
        if (parsed.ok) return;
        expect(parsed.error.field).toBe(field);
        expect(parsed.error.reason).toBe(reason);
        expect(parsed.error.message).toContain(field);
        expect(parsed.error.message.length).toBeGreaterThan(field.length + 10);
        if (reason === 'out-of-range') expect(parsed.error.message).toContain(`[-${GRID_LIMIT}, ${GRID_LIMIT}]`);
        if (reason === 'unknown-value') expect(parsed.error.message).toMatch(/one of: /);
    });

    test('imported coordinates are rejected, never snapped; the UI input path snaps and clamps to the grid', () => {
        expect(parseLineGeometryState({...DEFAULT_LINE_STATE, P: {x: 8, y: -8}}).ok).toBe(true);
        expect(parseLineGeometryState({...DEFAULT_LINE_STATE, P: {x: 8.0000001, y: 0}}).ok).toBe(false);
        expect(snapGridInput(3.4)).toEqual({ok: true, value: {value: 3, clamped: false, adjusted: true}});
        expect(snapGridInput(-2.5)).toEqual({ok: true, value: {value: -2, clamped: false, adjusted: true}});
        expect(snapGridInput(9)).toEqual({ok: true, value: {value: 8, clamped: true, adjusted: true}});
        expect(snapGridInput(-30.2)).toEqual({ok: true, value: {value: -8, clamped: true, adjusted: true}});
        expect(snapGridInput(5)).toEqual({ok: true, value: {value: 5, clamped: false, adjusted: false}});
        const zero = snapGridInput(-0.2);
        expect(zero.ok && Object.is(zero.value.value, 0)).toBe(true);
        const bad = snapGridInput(NaN, 'P.x');
        expect(bad.ok).toBe(false);
        if (!bad.ok) expect(bad.error).toMatchObject({field: 'P.x', reason: 'not-finite'});
    });

    test('the point fields are exactly the stored handles', () => {
        expect([...POINT_FIELDS]).toEqual(['P', 'Q', 'R', 'S', 'T', 'O', 'B']);
        expect(Object.keys(DEFAULT_LINE_STATE).sort()).toEqual([...POINT_FIELDS, 'mode', 'target'].sort());
    });
});

describe('forms (L1)', () => {
    test('P = (-2, 1), Q = (4, 4): 3x - 6y = -12, normalised x - 2y = -4, k = 1/2, n = 2, intercepts -4 and 2', () => {
        const derived = deriveLineGeometry(state({mode: 'forms'}));
        expect(derived.degenerate).toBeUndefined();
        const {first, forms} = derived;
        expect([first?.raw.a, first?.raw.b, first?.raw.c].map(text)).toEqual(['3', '-6', '-12']);
        expect([first?.line.a, first?.line.b, first?.line.c].map(text)).toEqual(['1', '-2', '-4']);
        expect(forms?.explicit.vertical).toBe(false);
        if (forms?.explicit.vertical === false) expect([forms.explicit.k.format(), forms.explicit.n.format()]).toEqual(['1/2', '2']);
        expect(forms?.intercept.kind).toBe('form');
        const intercept = forms?.intercept;
        if (intercept?.kind === 'form') {
            expect([intercept.form.m.format(), intercept.form.n.format()]).toEqual(['-4', '2']);
            expect(formatIntercept(intercept.form)).toBe('x/(−4) + y/2 = 1');
        }
        expect(forms?.twoPoint).toEqual({vertical: false, dx: 6, dy: 3});
        // the readout texts
        expect(formatImplicit(first!.raw)).toBe('3x − 6y = −12');
        expect(formatImplicit(first!.line)).toBe('x − 2y = −4');
        expect(formatExplicit(forms!.explicit)).toBe('y = (1/2)x + 2');
        expect(formatTwoPoint(DEFAULT_LINE_STATE.P, 6, 3)).toBe('y − 1 = 3/6 · (x + 2)');
    });

    test('hand oracle: both dragged points satisfy the normalised equation, checked with plain integers', () => {
        for (const [p, q] of [[pt(-2, 1), pt(4, 4)], [pt(-8, -8), pt(-2, -6)], [pt(8, 7), pt(-3, 0)], [pt(0, 0), pt(5, -5)]]) {
            const {line} = lineData(p, q)!;
            const [a, b, c] = [Number(line.a.num), Number(line.b.num), Number(line.c.num)];
            expect(a * p.x + b * p.y).toBe(c);
            expect(a * q.x + b * q.y).toBe(c);
            expect(a > 0 || (a === 0 && b > 0)).toBe(true);
        }
        // the L1 counter-example pairs describe one line: equal normalised triples
        const one = lineData(pt(-8, -8), pt(-2, -6))!.line;
        const two = lineData(pt(-2, -6), pt(4, -4))!.line;
        expect([one.a, one.b, one.c].map(text)).toEqual([two.a, two.b, two.c].map(text));
    });

    test('a vertical line has no explicit form and no two-point slope; the implicit form stays', () => {
        const derived = deriveLineGeometry(state({mode: 'forms', P: pt(3, -1), Q: pt(3, 5)}));
        expect(derived.forms?.explicit).toMatchObject({vertical: true});
        expect(formatExplicit(derived.forms!.explicit)).toBe('x = 3');
        expect(derived.forms?.twoPoint).toEqual({vertical: true});
        expect(formatImplicit(derived.first!.line)).toBe('x = 3');
        expect(derived.forms?.intercept.kind).toBe('axis-parallel');
    });

    test('a line through the origin has two zero intercepts, a parallel to an axis is missing one', () => {
        expect(deriveLineGeometry(state({mode: 'forms', P: pt(0, 0), Q: pt(2, 3)})).forms?.intercept.kind).toBe('origin');
        expect(deriveLineGeometry(state({mode: 'forms', P: pt(0, 2), Q: pt(4, 2)})).forms?.intercept.kind).toBe('axis-parallel');
        expect(deriveLineGeometry(state({mode: 'forms', P: pt(-3, 0), Q: pt(3, 0)})).forms?.intercept.kind).toBe('origin');
        const horizontal = deriveLineGeometry(state({mode: 'forms', P: pt(0, 2), Q: pt(4, 2)}));
        expect(formatExplicit(horizontal.forms!.explicit)).toBe('y = 2');
        expect(formatTwoPoint(pt(0, 2), 4, 0)).toBe('y − 2 = 0/4 · x');
        expect(formatTwoPoint(pt(5, 1), -3, -2)).toBe('y − 1 = −2/(−3) · (x − 5)');
    });

    test('coincident points give no line and nothing derived', () => {
        const derived = deriveLineGeometry(state({mode: 'forms', Q: DEFAULT_LINE_STATE.P}));
        expect(derived.degenerate).toBe('first-line');
        expect(derived.first).toBeUndefined();
        expect(derived.forms).toBeUndefined();
    });

    test('equation text for unit coefficients and negative slopes', () => {
        expect(formatExplicit(deriveLineGeometry(state({P: pt(0, 3), Q: pt(1, 2)})).forms!.explicit)).toBe('y = −x + 3');
        expect(formatExplicit(deriveLineGeometry(state({P: pt(0, 0), Q: pt(1, 1)})).forms!.explicit)).toBe('y = x');
        expect(formatExplicit(deriveLineGeometry(state({P: pt(0, 1), Q: pt(2, 4)})).forms!.explicit)).toBe('y = (3/2)x + 1');
        expect(formatImplicit(lineData(pt(0, 0), pt(0, 4))!.line)).toBe('x = 0');
        expect(formatImplicit(lineData(pt(-3, 2), pt(5, 2))!.line)).toBe('y = 2');
    });
});

describe('normal, parallel and perpendicular (L2)', () => {
    test('the line through T perpendicular to the first line: normal (1, -2), 2x + y = 4, slopes 1/2 and -2', () => {
        const derived = deriveLineGeometry(state({mode: 'normal'}));
        expect(derived.degenerate).toBeUndefined();
        expect(formatImplicit(derived.second!.line)).toBe('2x + y = 4');
        const normal = derived.normal!;
        expect([normal.n1.x, normal.n1.y].map(text)).toEqual(['1', '-2']);
        expect(text(normal.dot)).toBe('0');
        expect(text(normal.cross)).toBe('5');
        expect(normal.relation).toBe('perpendicular');
        expect(text(normal.slopeProduct)).toBe('-1');
    });

    test('x - 2y = -4 and x - 2y = 3 are parallel, the same pair of points is the same line', () => {
        const parallelPair = deriveLineGeometry(state({mode: 'normal', R: pt(3, 0), S: pt(5, 1)}));
        expect(formatImplicit(parallelPair.second!.line)).toBe('x − 2y = 3');
        expect(parallelPair.normal?.relation).toBe('parallel');
        expect(text(parallelPair.normal?.cross)).toBe('0');
        expect(text(parallelPair.normal?.slopeProduct)).toBe('1/4');
        // the same line from different points is "same", not just parallel
        expect(deriveLineGeometry(state({mode: 'normal', R: pt(0, 2), S: pt(-2, 1)})).normal?.relation).toBe('same');
    });

    test('the vertical and horizontal pair is perpendicular although the slope product does not exist', () => {
        const derived = deriveLineGeometry(state({mode: 'normal', P: pt(3, -1), Q: pt(3, 5), R: pt(0, 2), S: pt(4, 2)}));
        expect(derived.normal?.relation).toBe('perpendicular');
        expect(derived.normal?.slopeProduct).toBeUndefined();
    });

    test('hand oracle over all pairs of grid directions with components in [-4, 4]', () => {
        // first line through (0, 0) with direction (dx, dy); second through (0, 1) with direction (ex, ey)
        let checked = 0;
        for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) {
            if (dx === 0 && dy === 0) continue;
            for (let ex = -4; ex <= 4; ex++) for (let ey = -4; ey <= 4; ey++) {
                if (ex === 0 && ey === 0) continue;
                const cross = dx * ey - dy * ex;
                const dot = dx * ex + dy * ey;
                // (0, 1) lies on the first line exactly when its cross product with (dx, dy) is 0, i.e. dx = 0
                const expected = cross === 0 ? (dx === 0 ? 'same' : 'parallel') : dot === 0 ? 'perpendicular' : 'neither';
                const derived = deriveLineGeometry(state({mode: 'normal', P: pt(0, 0), Q: pt(dx, dy), R: pt(0, 1), S: pt(ex, 1 + ey)}));
                expect(derived.normal?.relation).toBe(expected);
                checked++;
            }
        }
        expect(checked).toBe(80 * 80);
    });

    test('a coincident second pair is named and gives no status of the pair', () => {
        const derived = deriveLineGeometry(state({mode: 'normal', S: DEFAULT_LINE_STATE.R}));
        expect(derived.degenerate).toBe('second-line');
        expect(derived.normal).toBeUndefined();
        expect(deriveLineGeometry(state({mode: 'normal', Q: DEFAULT_LINE_STATE.P, S: DEFAULT_LINE_STATE.R})).degenerate).toBe('first-line');
    });
});

describe('angle (L3)', () => {
    const angleOf = (u: GridPoint, v: GridPoint) => deriveLineGeometry(state({mode: 'angle', P: pt(0, 0), Q: u, R: pt(0, 0), S: v})).angle!;
    const deg = (radians: number) => (radians * 180) / Math.PI;

    test.each([
        [pt(2, 1), pt(1, 3), '5', '5', 45],
        [pt(4, 1), pt(1, 3), '7', '11', 57.5288],
        [pt(2, 1), pt(1, 0), '2', '-1', 26.5651],
    ])('u = (%o), v = (%o): dot %s, cross %s, angle %f degrees', (u, v, dot, cross, degrees) => {
        const angle = angleOf(u, v);
        expect(text(angle.dot)).toBe(dot);
        expect(text(angle.cross)).toBe(cross);
        expect(deg(angle.radians)).toBeCloseTo(degrees, 4);
        // the cosine rule holds as an exact identity: |u - v|^2 = |u|^2 + |v|^2 - 2 u.v
        expect(angle.differenceSquared.equals(angle.uSquared.add(angle.vSquared).sub(angle.dot.add(angle.dot)))).toBe(true);
    });

    test('the cosine-rule example: |u - v|^2 = 5 = 5 + 10 - 2 * 5', () => {
        const angle = angleOf(pt(2, 1), pt(1, 3));
        expect([angle.differenceSquared, angle.uSquared, angle.vSquared].map(text)).toEqual(['5', '5', '10']);
    });

    test('atan2 agrees with acos of the normalised dot to 1e-12 away from 0 and 90 degrees (independent oracle)', () => {
        for (const [u, v] of [[pt(2, 1), pt(1, 3)], [pt(4, 1), pt(1, 3)], [pt(2, 1), pt(1, 0)], [pt(-3, 5), pt(2, 7)], [pt(8, 1), pt(1, 8)]]) {
            const cos = Math.abs(u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
            expect(Math.abs(angleOf(u, v).radians - Math.acos(cos))).toBeLessThan(1e-12);
        }
    });

    test('the angle is acute whatever the order and sense of the directions', () => {
        expect(angleOf(pt(2, 1), pt(-1, -3)).radians).toBe(angleOf(pt(2, 1), pt(1, 3)).radians);
        expect(angleOf(pt(1, 3), pt(2, 1)).radians).toBe(angleOf(pt(2, 1), pt(1, 3)).radians);
    });

    test('parallel lines give exactly 0, perpendicular lines exactly 90 degrees, decided by the integers', () => {
        const parallel = angleOf(pt(2, 1), pt(-4, -2));
        expect([parallel.radians, parallel.relation]).toEqual([0, 'parallel']);
        const perpendicular = angleOf(pt(2, 1), pt(-1, 2));
        expect([perpendicular.radians, perpendicular.relation]).toEqual([Math.PI / 2, 'perpendicular']);
        expect(angleOf(pt(2, 1), pt(1, 3)).relation).toBe('neither');
    });

    test('the lines of the angle mode carry their common point (the arc anchor), or parallel', () => {
        const meet = deriveLineGeometry(state({mode: 'angle'})).lines;
        expect(meet?.kind).toBe('point');
        if (meet?.kind === 'point') expect([meet.point.x, meet.point.y].map(text)).toEqual(['4/5', '12/5']);
        expect(deriveLineGeometry(state({mode: 'angle', R: pt(3, 0), S: pt(5, 1)})).lines?.kind).toBe('parallel');
    });

    test('a coincident pair names the missing line', () => {
        expect(deriveLineGeometry(state({mode: 'angle', Q: DEFAULT_LINE_STATE.P})).degenerate).toBe('first-line');
        expect(deriveLineGeometry(state({mode: 'angle', S: DEFAULT_LINE_STATE.R})).angle).toBeUndefined();
    });
});

describe('distance (L4)', () => {
    test('x - 2y + 4 = 0 and T = (3, -2): value 11, d^2 = 121/5, foot (4/5, 12/5), PT = (5, -3) with PT.n = 11', () => {
        const d = deriveLineGeometry(state({mode: 'distance'})).distance!;
        expect(text(d.value)).toBe('11');
        expect(text(d.normSquared)).toBe('5');
        expect(text(d.distanceSquared)).toBe('121/5');
        expect(d.distance).toBeCloseTo(4.91935, 5);
        expect(d.distance).toBeCloseTo(11 / Math.sqrt(5), 12);
        expect([d.foot.x, d.foot.y].map(text)).toEqual(['4/5', '12/5']);
        expect([d.pt.x, d.pt.y].map(text)).toEqual(['5', '-3']);
        expect(text(d.ptDotN)).toBe('11');
        expect([d.projection.x, d.projection.y].map(text)).toEqual(['11/5', '-22/5']);
        expect(d.onLine).toBe(false);
    });

    test('hand oracle: the foot lies on the line and FT is perpendicular to it, in integers scaled by 5', () => {
        const d = deriveLineGeometry(state({mode: 'distance'})).distance!;
        const [fx, fy] = [Number(d.foot.x.num) * (5 / Number(d.foot.x.den)), Number(d.foot.y.num) * (5 / Number(d.foot.y.den))];
        expect([fx, fy]).toEqual([4, 12]);
        expect(fx - 2 * fy).toBe(-4 * 5); // x - 2y = -4
        const [tx, ty] = [3 * 5 - fx, -2 * 5 - fy]; // 5 (T - F) = (11, -22), parallel to the normal (1, -2)
        expect(tx * -2 - ty * 1).toBe(0);
        expect(tx * 2 + ty * 1).toBe(0); // FT . direction (2, 1) = 0: the right angle at the foot
    });

    test('T on the line has distance 0 and the foot is T, decided by an integer determinant', () => {
        const onLine = state({mode: 'distance', T: pt(0, 2)});
        // determinant of (Q - P) and (T - P) written by hand
        const det = (onLine.Q.x - onLine.P.x) * (onLine.T.y - onLine.P.y) - (onLine.Q.y - onLine.P.y) * (onLine.T.x - onLine.P.x);
        expect(det).toBe(0);
        const d = deriveLineGeometry(onLine).distance!;
        expect(d.onLine).toBe(true);
        expect(d.distance).toBe(0);
        expect([d.foot.x, d.foot.y].map(text)).toEqual(['0', '2']);
        expect(text(d.distanceSquared)).toBe('0');
        const off = state({mode: 'distance', T: pt(0, 3)});
        expect((off.Q.x - off.P.x) * (off.T.y - off.P.y) - (off.Q.y - off.P.y) * (off.T.x - off.P.x)).not.toBe(0);
        expect(deriveLineGeometry(off).distance?.onLine).toBe(false);
    });

    test('a coincident first pair gives no distance', () => {
        const derived = deriveLineGeometry(state({mode: 'distance', Q: DEFAULT_LINE_STATE.P}));
        expect(derived.degenerate).toBe('first-line');
        expect(derived.distance).toBeUndefined();
    });

    test('the foot of T stays within |coordinate| <= 15.5 for every line and T on the grid (the graph view is 17)', () => {
        let max = 0;
        for (let px = -8; px <= 8; px++) for (let py = -8; py <= 8; py++) for (let qx = -8; qx <= 8; qx++) for (let qy = -8; qy <= 8; qy++) {
            const dx = qx - px;
            const dy = qy - py;
            const n = dx * dx + dy * dy;
            if (n === 0) continue;
            for (let tx = -8; tx <= 8; tx++) for (let ty = -8; ty <= 8; ty++) {
                const t = ((tx - px) * dx + (ty - py) * dy) / n;
                max = Math.max(max, Math.abs(px + t * dx), Math.abs(py + t * dy));
            }
        }
        expect(max).toBe(15.5);
    });
});

describe('intersections (L5)', () => {
    test('x - 2y = -4 and 2x + y = 4 meet at (4/5, 12/5)', () => {
        const derived = deriveLineGeometry(state({mode: 'intersect', target: 'lines'}));
        expect(derived.lines?.kind).toBe('point');
        if (derived.lines?.kind !== 'point') return;
        const [x, y] = [derived.lines.point.x, derived.lines.point.y];
        expect([text(x), text(y)]).toEqual(['4/5', '12/5']);
        // brute force: substitute into both equations with integers scaled by 5
        expect(4 - 2 * 12).toBe(-4 * 5);
        expect(2 * 4 + 12).toBe(4 * 5);
    });

    test('parallel and same lines are reported exactly', () => {
        expect(deriveLineGeometry(state({mode: 'intersect', R: pt(3, 0), S: pt(5, 1)})).lines?.kind).toBe('parallel');
        expect(deriveLineGeometry(state({mode: 'intersect', R: pt(0, 2), S: pt(-2, 1)})).lines?.kind).toBe('same');
    });

    test('circle centre (1, 0) through (3, 1): s = 5, discriminant 0, tangent at (0, 2)', () => {
        const derived = deriveLineGeometry(state({mode: 'intersect', target: 'circle'}));
        const circle = derived.circle!;
        expect(text(circle.circle.r2)).toBe('5');
        expect([text(circle.s), text(circle.normSquared), text(circle.discriminant)]).toEqual(['5', '5', '0']);
        expect(circle.result.kind).toBe('tangent');
        if (circle.result.kind === 'tangent') expect([circle.result.exact.x, circle.result.exact.y].map(text)).toEqual(['0', '2']);
        expect(derived.lines).toBeUndefined();
    });

    test('boundary (3, 0): r^2 = 4, discriminant -5, no points', () => {
        const circle = deriveLineGeometry(state({mode: 'intersect', target: 'circle', B: pt(3, 0)})).circle!;
        expect(text(circle.circle.r2)).toBe('4');
        expect(text(circle.discriminant)).toBe('-5');
        expect(circle.result.kind).toBe('none');
    });

    test('boundary (3, 2): r^2 = 8, discriminant 15, two points that lie on both curves', () => {
        const circle = deriveLineGeometry(state({mode: 'intersect', target: 'circle', B: pt(3, 2)})).circle!;
        expect(text(circle.discriminant)).toBe('15');
        expect(circle.result.kind).toBe('two');
        if (circle.result.kind !== 'two') return;
        const [first, second] = [...circle.result.points].sort((p, q) => p.x - q.x);
        expect([first.x, first.y]).toEqual([expect.closeTo(-1.549, 3), expect.closeTo(1.225, 3)]);
        expect([second.x, second.y]).toEqual([expect.closeTo(1.549, 3), expect.closeTo(2.775, 3)]);
        for (const p of [first, second]) {
            expect(p.x - 2 * p.y).toBeCloseTo(-4, 12); // on the line
            expect((p.x - 1) ** 2 + p.y ** 2).toBeCloseTo(8, 12); // on the circle
        }
    });

    test('the circle needs two distinct points: centre equal to the boundary point names the circle', () => {
        const derived = deriveLineGeometry(state({mode: 'intersect', target: 'circle', B: DEFAULT_LINE_STATE.O}));
        expect(derived.degenerate).toBe('circle');
        expect(derived.circle).toBeUndefined();
        expect(deriveLineGeometry(state({mode: 'intersect', target: 'circle', Q: DEFAULT_LINE_STATE.P})).degenerate).toBe('first-line');
    });

    test('the second line is not required for the circle target and the circle is not required for the lines target', () => {
        expect(deriveLineGeometry(state({mode: 'intersect', target: 'circle', S: DEFAULT_LINE_STATE.R})).degenerate).toBeUndefined();
        expect(deriveLineGeometry(state({mode: 'intersect', target: 'lines', B: DEFAULT_LINE_STATE.O})).degenerate).toBeUndefined();
    });
});

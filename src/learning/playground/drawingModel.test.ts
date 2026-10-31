import {describe, expect, it} from 'vitest';
import {
    Anchor, Drawing, EMPTY_DRAWING, MAX_ANCHORS, Point, addPointAfterLast, appendCorner, appendSmooth, canRedo, canUndo,
    classifyJoint, closeDrawing, clearDrawing, createHistory, deCasteljauRows, deleteAnchor, evaluateBezier, jointIndices,
    moveAnchor, moveHandle, pushHistory, redoHistory, segments, setAnchorType, singleCurveControlPoints, toSvgPath,
    toggleAnchorType, undoHistory, validateDrawing,
} from './drawingModel';

const P = (x: number, y: number): Point => ({x, y});

/** Independent cubic Bernstein form. */
function cubic(s: readonly Point[], t: number): Point {
    const u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return {x: w.reduce((a, c, k) => a + c * s[k].x, 0), y: w.reduce((a, c, k) => a + c * s[k].y, 0)};
}

/** Independent degree-n Bernstein form via iterative coefficients (stable for n = 96, t in (0,1)). */
function bernstein(pts: readonly Point[], t: number): Point {
    const n = pts.length - 1;
    let b = Math.pow(1 - t, n);
    let x = 0;
    let y = 0;
    for (let k = 0; k <= n; k++) {
        x += b * pts[k].x;
        y += b * pts[k].y;
        b = b * ((n - k) / (k + 1)) * (t / (1 - t));
    }
    return {x, y};
}

/** Independent convex hull (monotone chain), counter-clockwise. */
function hull(points: readonly Point[]): Point[] {
    const s = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const cr = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: Point[] = [];
    for (const p of s) {
        while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper: Point[] = [];
    for (const p of [...s].reverse()) {
        while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

function insideHull(h: Point[], p: Point, tol: number): boolean {
    for (let i = 0; i < h.length; i++) {
        const a = h[i];
        const b = h[(i + 1) % h.length];
        const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (c < -tol * Math.hypot(b.x - a.x, b.y - a.y)) return false;
    }
    return true;
}

/** Three smooth-mirrored-ish anchors with distinct handles. */
function sample(closed = false): Drawing {
    let d = appendSmooth(EMPTY_DRAWING, P(100, 300), P(150, 250));
    d = appendSmooth(d, P(400, 200), P(450, 220));
    d = appendCorner(d, P(700, 400));
    return closed ? closeDrawing(d) : d;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe('segments and SVG path', () => {
    it('maps open paths to P0..P3', () => {
        const d = sample();
        const [s0, s1] = segments(d);
        const [a, b, c] = d.anchors;
        expect(segments(d)).toHaveLength(2);
        expect(s0).toEqual([a.position, a.handleOut, b.handleIn, b.position]);
        expect(s1).toEqual([b.position, b.handleOut, c.handleIn, c.position]);
    });

    it('adds the closing segment for closed paths', () => {
        const d = sample(true);
        const segs = segments(d);
        const [a, , c] = d.anchors;
        expect(segs).toHaveLength(3);
        expect(segs[2]).toEqual([c.position, c.handleOut, a.handleIn, a.position]);
    });

    it('encodes the same points in the SVG path', () => {
        for (const closed of [false, true]) {
            const d = sample(closed);
            const path = toSvgPath(d);
            const nums = path.match(/-?\d+(\.\d+)?/g)!.map(Number);
            const expected = segments(d).flatMap((s, i) => (i === 0 ? [s[0], s[1], s[2], s[3]] : [s[1], s[2], s[3]])).flatMap(p => [p.x, p.y]);
            expect(nums).toEqual(expected);
            expect(path.startsWith('M ')).toBe(true);
            expect((path.match(/C/g) ?? []).length).toBe(segments(d).length);
            expect(path.endsWith('Z')).toBe(closed);
        }
        expect(toSvgPath(EMPTY_DRAWING)).toBe('');
    });
});

describe('kernel evaluation', () => {
    it('matches the cubic Bernstein form to 1e-12', () => {
        for (const closed of [false, true]) {
            for (const s of segments(sample(closed))) {
                for (const t of [0, 0.25, 0.5, 1]) {
                    const k = evaluateBezier(s, t);
                    const b = cubic(s, t);
                    expect(Math.abs(k.x - b.x)).toBeLessThan(1e-12);
                    expect(Math.abs(k.y - b.y)).toBeLessThan(1e-12);
                    expect(dist(k, b)).toBeLessThan(1e-12);
                }
            }
        }
    });

    it('deCasteljauRows has shrinking levels ending at the curve point', () => {
        const s = segments(sample())[0];
        const rows = deCasteljauRows(s, 0.3);
        expect(rows.map(r => r.length)).toEqual([4, 3, 2, 1]);
        expect(dist(rows[3][0], evaluateBezier(s, 0.3))).toBeLessThan(1e-12);
    });
});

describe('handle constraints', () => {
    it('mirrored keeps H- + H+ = 2A', () => {
        const d = moveHandle(sample(), 1, 'out', P(520, 90));
        const a = d.anchors[1];
        expect(a.handleIn.x + a.handleOut.x).toBeCloseTo(2 * a.position.x, 12);
        expect(a.handleIn.y + a.handleOut.y).toBeCloseTo(2 * a.position.y, 12);
        const e = moveHandle(sample(), 1, 'in', P(300, 100));
        expect(e.anchors[1].handleOut.x).toBeCloseTo(2 * 400 - 300, 12);
    });

    it('aligned is collinear, opposite, and keeps the other length', () => {
        let d = setAnchorType(sample(), 1, 'smooth-aligned');
        const oldLenOut = dist(d.anchors[1].handleOut, d.anchors[1].position);
        d = moveHandle(d, 1, 'in', P(300, 330));
        const a = d.anchors[1];
        const u = {x: a.handleIn.x - a.position.x, y: a.handleIn.y - a.position.y};
        const v = {x: a.handleOut.x - a.position.x, y: a.handleOut.y - a.position.y};
        expect(u.x * v.y - u.y * v.x).toBeCloseTo(0, 9);
        expect(u.x * v.x + u.y * v.y).toBeLessThan(0);
        expect(Math.hypot(v.x, v.y)).toBeCloseTo(oldLenOut, 12);
        expect(a.type).toBe('smooth-aligned');
    });

    it('corner leaves the other handle unchanged', () => {
        const d = sample();
        const before = d.anchors[2];
        const e = moveHandle(d, 2, 'out', P(800, 500));
        expect(e.anchors[2].handleIn).toEqual(before.handleIn);
        expect(e.anchors[2].handleOut).toEqual(P(800, 500));
        const f = moveHandle(appendCorner(EMPTY_DRAWING, P(1, 1)), 0, 'in', P(5, 5));
        expect(f.anchors[0].handleOut).toEqual(P(1, 1));
    });

    it('Alt-drag converts mirrored to aligned, keeping the other length', () => {
        const d = sample();
        const oldLen = dist(d.anchors[1].handleIn, d.anchors[1].position);
        const e = moveHandle(d, 1, 'out', P(600, 300), true);
        expect(e.anchors[1].type).toBe('smooth-aligned');
        expect(dist(e.anchors[1].handleIn, e.anchors[1].position)).toBeCloseTo(oldLen, 12);
        expect(dist(e.anchors[1].handleOut, e.anchors[1].position)).toBeCloseTo(dist(P(600, 300), P(400, 200)), 12);
    });

    it('moveAnchor moves both handles and does not mutate', () => {
        const d = sample();
        const snapshot = JSON.stringify(d);
        const e = moveAnchor(d, 1, P(410, 230));
        expect(e.anchors[1].handleOut).toEqual(P(460, 250));
        expect(e.anchors[1].handleIn).toEqual(P(360, 210));
        expect(JSON.stringify(d)).toBe(snapshot);
    });
});

describe('setAnchorType', () => {
    it('places smooth handles along previous -> next at a third of the chords', () => {
        const d = appendCorner(appendCorner(appendCorner(EMPTY_DRAWING, P(0, 0)), P(300, 0)), P(300, 600));
        const e = setAnchorType(d, 1, 'smooth-aligned');
        const a = e.anchors[1];
        const dir = {x: 300, y: 600};
        const l = Math.hypot(300, 600);
        expect(a.handleOut.x - 300).toBeCloseTo((dir.x / l) * 200, 9);
        expect(a.handleOut.y).toBeCloseTo((dir.y / l) * 200, 9);
        expect(dist(a.handleIn, a.position)).toBeCloseTo(100, 9);
        expect(classifyJoint(e, 1)).toBe('G1');
        expect(classifyJoint(setAnchorType(d, 1, 'smooth-mirrored'), 1)).toBe('C1');
    });

    it('handles end anchors and toggles', () => {
        const d = appendCorner(appendCorner(EMPTY_DRAWING, P(0, 0)), P(300, 0));
        const e = setAnchorType(d, 0, 'smooth-mirrored');
        expect(e.anchors[0].handleOut).toEqual(P(100, 0));
        expect(e.anchors[0].handleIn).toEqual(P(-100, 0));
        const t = toggleAnchorType(toggleAnchorType(d, 0), 0);
        expect(t.anchors[0].type).toBe('corner');
        expect(toggleAnchorType(d, 0).anchors[0].type).toBe('smooth-mirrored');
    });
});

describe('classifyJoint', () => {
    const joint = (hin: Point, hout: Point): Drawing => ({
        closed: false,
        anchors: [
            {position: P(0, 0), handleIn: P(0, 0), handleOut: P(0, 0), type: 'corner'},
            {position: P(500, 300), handleIn: hin, handleOut: hout, type: 'corner'},
            {position: P(900, 0), handleIn: P(900, 0), handleOut: P(900, 0), type: 'corner'},
        ],
    });
    it('C1, G1, C0', () => {
        expect(classifyJoint(joint(P(450, 300), P(550, 300)), 1)).toBe('C1');
        expect(classifyJoint(joint(P(450, 300), P(600, 300)), 1)).toBe('G1');
        expect(classifyJoint(joint(P(450, 300), P(500, 350)), 1)).toBe('C0');
        expect(classifyJoint(joint(P(450, 300), P(450, 300)), 1)).toBe('C0'); // opposite directions
    });
    it('zero-length handles', () => {
        expect(classifyJoint(joint(P(500, 300), P(500, 300)), 1)).toBe('C1');
        expect(classifyJoint(joint(P(500, 300), P(550, 300)), 1)).toBe('C0');
        expect(classifyJoint(joint(P(450, 300), P(500, 300)), 1)).toBe('C0');
    });
    it('lists joints', () => {
        expect(jointIndices(sample())).toEqual([1]);
        expect(jointIndices(sample(true))).toEqual([0, 1, 2]);
        expect(jointIndices(appendCorner(EMPTY_DRAWING, P(1, 1)))).toEqual([]);
    });
});

describe('single curve', () => {
    it('has 3k+1 points and the right ends', () => {
        const o = sample();
        const pts = singleCurveControlPoints(o);
        expect(pts).toHaveLength(3 * 2 + 1);
        expect(pts[0]).toEqual(o.anchors[0].position);
        expect(pts[6]).toEqual(o.anchors[2].position);
        const c = sample(true);
        const cp = singleCurveControlPoints(c);
        expect(cp).toHaveLength(3 * 3 + 1);
        expect(cp[9]).toEqual(c.anchors[0].position);
        expect(singleCurveControlPoints(EMPTY_DRAWING)).toEqual([]);
    });

    it('starts/ends at end points and stays in the convex hull over 400+ samples', () => {
        const d = sample(true);
        const pts = singleCurveControlPoints(d);
        const h = hull(pts);
        const N = 500;
        expect(dist(evaluateBezier(pts, 0), pts[0])).toBeLessThan(1e-9);
        expect(dist(evaluateBezier(pts, 1), pts[pts.length - 1])).toBeLessThan(1e-9);
        for (let i = 0; i <= N; i++) {
            expect(insideHull(h, evaluateBezier(pts, i / N), 1e-9)).toBe(true);
        }
        expect(insideHull(h, P(5000, 5000), 1e-9)).toBe(false); // sanity of the hull test
    });

    it('degree 96 at t = 1/2 matches the Bernstein form to 1e-9', () => {
        let d = EMPTY_DRAWING;
        for (let i = 0; i < MAX_ANCHORS; i++) {
            d = appendSmooth(d, P(30 + 30 * i, 300 + (i % 2 ? 80 : -80)), P(45 + 30 * i, 300 + (i % 3) * 40));
        }
        d = closeDrawing(d);
        const pts = singleCurveControlPoints(d);
        expect(pts).toHaveLength(97);
        const k = evaluateBezier(pts, 0.5);
        const b = bernstein(pts, 0.5);
        expect(Math.abs(k.x - b.x)).toBeLessThan(1e-9);
        expect(Math.abs(k.y - b.y)).toBeLessThan(1e-9);
        const k2 = evaluateBezier(pts, 0.3);
        const b2 = bernstein(pts, 0.3);
        expect(dist(k2, b2)).toBeLessThan(1e-9);
    });
});

describe('structure operations', () => {
    it('respects the 32-anchor cap', () => {
        let d = EMPTY_DRAWING;
        for (let i = 0; i < 40; i++) d = appendCorner(d, P(10 + i, 10));
        expect(d.anchors).toHaveLength(MAX_ANCHORS);
        expect(appendCorner(d, P(1, 1))).toBe(d);
        expect(appendSmooth(d, P(1, 1), P(2, 2))).toBe(d);
        expect(addPointAfterLast(d)).toBe(d);
    });

    it('addPointAfterLast is 60 away and inside the viewBox', () => {
        const d = appendCorner(EMPTY_DRAWING, P(980, 300));
        const e = addPointAfterLast(d);
        const p = e.anchors[1].position;
        expect(dist(p, P(980, 300))).toBeCloseTo(60, 12);
        expect(p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 625).toBe(true);
        const corner = addPointAfterLast(addPointAfterLast(appendCorner(EMPTY_DRAWING, P(1000, 625))));
        for (const a of corner.anchors) expect(a.position.x <= 1000 && a.position.y <= 625).toBe(true);
        expect(addPointAfterLast(EMPTY_DRAWING).anchors).toHaveLength(1);
    });

    it('close, delete, clear', () => {
        expect(closeDrawing(appendCorner(EMPTY_DRAWING, P(1, 1))).closed).toBe(false);
        const c = sample(true);
        expect(c.closed).toBe(true);
        expect(closeDrawing(c)).toBe(c);
        expect(appendCorner(c, P(1, 1))).toBe(c);
        expect(deleteAnchor(c, 0).anchors).toHaveLength(2);
        expect(deleteAnchor(c, 0).closed).toBe(true);
        expect(deleteAnchor(deleteAnchor(c, 0), 0).closed).toBe(false);
        expect(clearDrawing().anchors).toHaveLength(0);
    });
});

describe('validateDrawing', () => {
    const anchor = (): Anchor => ({position: P(1, 2), handleIn: P(0, 2), handleOut: P(2, 2), type: 'smooth-mirrored'});
    it('round-trips through JSON', () => {
        const d = sample(true);
        expect(validateDrawing(JSON.parse(JSON.stringify(d)))).toEqual(d);
    });
    it('rejects invalid data without throwing', () => {
        const bad: unknown[] = [
            null, undefined, 5, 'x', [], {},
            {anchors: [], closed: 'no'},
            {anchors: 'x', closed: false},
            {anchors: [{...anchor(), position: P(NaN, 1)}], closed: false},
            {anchors: [{...anchor(), handleOut: P(Infinity, 1)}], closed: false},
            {anchors: [{...anchor(), type: 'weird'}], closed: false},
            {anchors: [{...anchor(), position: {x: '1', y: 2}}], closed: false},
            {anchors: [null], closed: false},
            {anchors: Array.from({length: 33}, anchor), closed: false},
        ];
        for (const b of bad) expect(validateDrawing(b)).toBeNull();
        expect(validateDrawing({anchors: Array.from({length: 32}, anchor), closed: true})).not.toBeNull();
        const hostile = {get anchors(): unknown { throw new Error('x'); }, closed: false};
        expect(validateDrawing(hostile)).toBeNull();
    });
});

describe('history', () => {
    it('undo/redo and redo clearing', () => {
        let h = createHistory(0);
        expect(canUndo(h)).toBe(false);
        expect(canRedo(h)).toBe(false);
        h = pushHistory(pushHistory(h, 1), 2);
        h = undoHistory(h);
        expect(h.present).toBe(1);
        expect(canRedo(h)).toBe(true);
        expect(redoHistory(h).present).toBe(2);
        h = pushHistory(h, 3);
        expect(canRedo(h)).toBe(false);
        expect(undoHistory(undoHistory(undoHistory(h))).present).toBe(0);
        expect(undoHistory(createHistory(7)).present).toBe(7);
    });
    it('retains at least 100 steps', () => {
        let h = createHistory(0);
        for (let i = 1; i <= 150; i++) h = pushHistory(h, i);
        for (let i = 0; i < 120; i++) h = undoHistory(h);
        expect(h.present).toBe(30);
        for (let i = 0; i < 120; i++) h = redoHistory(h);
        expect(h.present).toBe(150);
    });
});

describe('degenerate geometry', () => {
    const anchor = (position: Point, handleIn: Point, handleOut: Point, type: Anchor['type'] = 'corner'): Anchor =>
        ({position, handleIn, handleOut, type});
    const finite = (p: Point) => Number.isFinite(p.x) && Number.isFinite(p.y);

    it('setAnchorType keeps the stored smooth type truthful when both neighbours coincide', () => {
        const d: Drawing = {
            anchors: [anchor(P(100, 100), P(90, 120), P(130, 90)), anchor(P(400, 300), P(400, 300), P(400, 300))],
            closed: true,
        };
        const mirrored = setAnchorType(d, 0, 'smooth-mirrored');
        const a = mirrored.anchors[0];
        expect(finite(a.handleIn) && finite(a.handleOut)).toBe(true);
        expect(a.handleIn.x + a.handleOut.x).toBeCloseTo(2 * a.position.x, 12);
        expect(a.handleIn.y + a.handleOut.y).toBeCloseTo(2 * a.position.y, 12);
        expect(Math.hypot(a.handleOut.x - a.position.x, a.handleOut.y - a.position.y)).toBeGreaterThan(0);
        expect(classifyJoint(mirrored, 0)).toBe('C1');
        expect(classifyJoint(setAnchorType(d, 0, 'smooth-aligned'), 0)).not.toBe('C0');
    });

    it('setAnchorType on a lone anchor collapses its handles onto it', () => {
        const d: Drawing = {anchors: [anchor(P(50, 60), P(10, 10), P(90, 20))], closed: false};
        const a = setAnchorType(d, 0, 'smooth-mirrored').anchors[0];
        expect(a.handleIn).toEqual(P(50, 60));
        expect(a.handleOut).toEqual(P(50, 60));
    });

    it('aligned handle dragged onto its anchor leaves the other handle finite and unchanged', () => {
        const d: Drawing = {
            anchors: [
                anchor(P(0, 0), P(0, 0), P(50, 0)),
                anchor(P(200, 0), P(150, 0), P(260, 0), 'smooth-aligned'),
                anchor(P(400, 0), P(350, 0), P(400, 0)),
            ],
            closed: false,
        };
        const a = moveHandle(d, 1, 'out', P(200, 0)).anchors[1];
        expect(a.handleOut).toEqual(P(200, 0));
        expect(a.handleIn).toEqual(P(150, 0));
    });

    it('ignores the hidden end handles of an open path', () => {
        const base: Drawing = {
            anchors: [
                anchor(P(0, 0), P(0, 0), P(50, 40)),
                anchor(P(200, 100), P(150, 90), P(260, 120)),
                anchor(P(400, 0), P(350, 10), P(400, 0)),
            ],
            closed: false,
        };
        const wild: Drawing = {
            anchors: [{...base.anchors[0], handleIn: P(-999, 777)}, base.anchors[1], {...base.anchors[2], handleOut: P(888, -555)}],
            closed: false,
        };
        expect(segments(wild)).toEqual(segments(base));
        expect(toSvgPath(wild)).toBe(toSvgPath(base));
        expect(jointIndices(wild)).toEqual(jointIndices(base));
        expect(jointIndices(base)).toEqual([1]);
    });

    it('classifies a near-collinear joint on either side of the G1 tolerance', () => {
        const at = (delta: number): Drawing => ({
            anchors: [
                anchor(P(0, 300), P(0, 300), P(100, 300)),
                anchor(P(500, 300), P(400, 300), P(700, 300 + delta)),
                anchor(P(900, 300), P(800, 300), P(900, 300)),
            ],
            closed: false,
        });
        expect(classifyJoint(at(0), 1)).toBe('G1');
        expect(classifyJoint(at(1e-8), 1)).toBe('G1');
        expect(classifyJoint(at(1e-6), 1)).toBe('C0');
        expect(classifyJoint(at(1), 1)).toBe('C0');
    });
});

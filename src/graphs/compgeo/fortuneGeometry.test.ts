import {describe, expect, test} from 'vitest';
import {FORTUNE_EXAMPLE_1, FORTUNE_EXAMPLE_2, randomGeneralSites} from './fortunePresetCollection';
import {type ArcDraw, ARC_SAMPLES, parabolaY} from './fortuneGeometry';
import {heightText, runFortune, siteNames} from './fortuneRun';
import {Rational} from '../../compgeo/rational';
import type {GridPoint} from '../../compgeo/grid';

const run = runFortune(FORTUNE_EXAMPLE_1.points);

describe('Fortune steps of the default example', () => {
    test('the beach line as site names at each step', () => {
        const beaches = Array.from({length: run.length}, (_, k) => siteNames(run.view(k)?.state.beach ?? []));
        expect(beaches[0]).toBe('');
        expect(beaches).toContain('A, B, A, C, A');
        expect(beaches.some(b => b.split(', ').length > 5)).toBe(true);
    });

    test('the cancelled circle is present after D and the scheduled one before', () => {
        const views = Array.from({length: run.length}, (_, k) => run.view(k));
        const withScheduled = views.findIndex(v => v && v.scheduled.length > 0);
        const withCancelled = views.findIndex(v => v && v.cancelled.length > 0);
        expect(withScheduled).toBeGreaterThanOrEqual(0);
        expect(withCancelled).toBeGreaterThan(withScheduled);
    });

    test('every drawn arc point lies on the lower envelope of all processed parabolas', () => {
        for (let k = 1; k < run.length - 1; k++) {
            const view = run.view(k);
            if (!view || view.level === null) continue;
            const level = view.level;
            const processed = [...new Set(view.state.beach)].map(s => run.sites[s]);
            for (const arc of view.arcs) {
                arc.xs.forEach((x, i) => {
                    if (run.sites[arc.site].y - level <= 1e-9) return;
                    const envelope = Math.min(...processed.filter(p => p.y - level > 1e-9).map(p => parabolaY(p, level, x)));
                    expect(arc.ys[i]).toBeLessThanOrEqual(envelope + 1e-6);
                });
            }
        }
    });
});

describe('Fortune box', () => {
    test('the 12-site random examples have a box that contains their sites (frame margins need not be integers)', () => {
        for (let seed = 1; seed <= 30; seed++) {
            const sites = randomGeneralSites(seed).points;
            const box = runFortune(sites).box;
            expect(box, `seed ${seed}`).toBeDefined();
            for (const p of sites) {
                expect(box!.minX.toNumber()).toBeLessThanOrEqual(p.x);
                expect(box!.maxX.toNumber()).toBeGreaterThanOrEqual(p.x);
                expect(box!.minY.toNumber()).toBeLessThanOrEqual(p.y);
                expect(box!.maxY.toNumber()).toBeGreaterThanOrEqual(p.y);
            }
        }
    });
});

const dist = (p: {x: number; y: number}, s: GridPoint) => Math.hypot(p.x - s.x, p.y - s.y);
const equidistant = (p: {x: number; y: number}, a: GridPoint, b: GridPoint) => Math.abs(dist(p, a) - dist(p, b)) <= 1e-9 * Math.max(1, dist(p, a));

describe('Fortune trace origins', () => {
    const sets = [FORTUNE_EXAMPLE_1.points, ...[1, 2, 3, 4].map(seed => randomGeneralSites(seed).points)];

    test('every open trace begins at a point equidistant from the two sites it separates, and every finished trace lies on one bisector', () => {
        let open = 0;
        let finished = 0;
        for (const sites of sets) {
            const r = runFortune(sites);
            for (let k = 0; k < r.length; k++) {
                const view = r.view(k);
                for (const bp of view?.breakpoints ?? []) {
                    if (!bp.from) continue;
                    const [a, b] = [sites[r.outcome.ok ? r.outcome.arcSite[bp.left] : 0], sites[r.outcome.ok ? r.outcome.arcSite[bp.right] : 0]];
                    expect(equidistant(bp.from, a, b), `open trace at step ${k}`).toBe(true);
                    open++;
                }
                for (const done of view?.finished ?? []) {
                    if (!done.from) continue;
                    const pairs = sites.flatMap((a, i) => sites.slice(i + 1).map(b => [a, b] as const));
                    expect(pairs.some(([a, b]) => equidistant(done.from!, a, b) && equidistant(done.to, a, b)), `finished trace at step ${k}`).toBe(true);
                    finished++;
                }
            }
        }
        expect(open).toBeGreaterThan(5);
        expect(finished).toBeGreaterThan(5);
    });
});

describe('Fortune sweep height text', () => {
    test('a circle whose lowest point is at an integer height collapses to a rational, a surd keeps q - sqrt r', () => {
        const square = heightText({kind: 'surd', q: Rational.fromInt(-1), r: Rational.fromInt(16)});
        expect([square.kind, square.latex, square.value]).toEqual(['rational', '-5', -5]);
        const quarter = heightText({kind: 'surd', q: Rational.fromInt(1), r: Rational.of(9, 4)});
        expect([quarter.kind, quarter.latex]).toEqual(['rational', '-\\tfrac{1}{2}']);
        const surd = heightText({kind: 'surd', q: Rational.fromInt(-1), r: Rational.fromInt(8)});
        expect(surd.kind).toBe('surd');
        expect(surd.latex).toBe('-1-\\sqrt{8}');
        expect(surd.value).toBeCloseTo(-1 - Math.sqrt(8), 12);
    });

    test('in the default example the circle through A, B, C has its lowest point at the integer height -5 (a rational), the executed circle shows a surd', () => {
        const result = run.result!;
        const abc = result.circles.find(c => [...c.sites].sort().join() === '0,1,2')!;
        const cancelledHeight = heightText({kind: 'surd', q: abc.centre.y, r: abc.r2});
        expect([cancelledHeight.kind, cancelledHeight.latex, cancelledHeight.value]).toEqual(['rational', '-5', -5]);
        const executed = Array.from({length: run.length}, (_, k) => run.view(k)?.state.height).find(h => h?.kind === 'surd');
        const text = heightText(executed!);
        expect([text.kind, text.latex]).toEqual(['surd', '1-\\sqrt{\\tfrac{65}{4}}']);
        expect(text.value).toBeCloseTo(1 - Math.sqrt(65) / 2, 12);
    });
});

describe('Fortune box contents', () => {
    test('the box contains every vertex and the lowest point of every circle (circles of radius above 3 spans are skipped by design)', () => {
        for (const sites of [FORTUNE_EXAMPLE_1.points, ...[1, 2, 3, 4, 5].map(seed => randomGeneralSites(seed).points)]) {
            const r = runFortune(sites);
            const result = r.result!;
            const box = r.box!;
            const [minX, maxX, minY, maxY] = [box.minX, box.maxX, box.minY, box.maxY].map(v => v.toNumber());
            for (const v of result.diagram.vertices) {
                const p = {x: v.point.x.toNumber(), y: v.point.y.toNumber()};
                expect(p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY).toBe(true);
            }
            const span = Math.max(box.maxX.sub(box.minX).toNumber(), box.maxY.sub(box.minY).toNumber());
            let checked = 0;
            for (const circle of result.circles) {
                const radius = Math.sqrt(circle.r2.toNumber());
                const low = {x: circle.centre.x.toNumber(), y: circle.centre.y.toNumber() - radius};
                if (radius > 3 * span) continue;
                expect(low.x >= minX && low.x <= maxX && low.y >= minY - 1e-9 && low.y <= maxY).toBe(true);
                checked++;
            }
            expect(checked).toBeGreaterThan(0);
        }
    });
});

describe('the drawn beach line is continuous (acceptance 5)', () => {
    const JOIN_TOLERANCE = 1e-6; // arc ends meet at their shared breakpoint within this, in graph units (doubles, not exact)
    const X_TOLERANCE = 1e-9;
    const sets: readonly {name: string; sites: readonly GridPoint[]}[] = [
        {name: 'default example', sites: FORTUNE_EXAMPLE_1.points},
        {name: 'example without D', sites: FORTUNE_EXAMPLE_2.points},
        {name: 'two sites at the same height', sites: [{x: -3, y: 4}, {x: 3, y: 4}, {x: 0, y: -2}]},
        ...[1, 2, 3, 4, 5, 6].map(seed => ({name: `random seed ${seed}`, sites: randomGeneralSites(seed).points})),
    ];

    test('at every step the arcs meet at their breakpoints, cover the box width and have no x gap above the sampling step', () => {
        let steps = 0;
        let junctions = 0;
        let pointedArcs = 0;
        let covered = 0;
        for (const {name, sites} of sets) {
            const r = runFortune(sites);
            const [minX, maxX] = [r.box!.minX.toNumber(), r.box!.maxX.toNumber()];
            const sampling = (maxX - minX) / (ARC_SAMPLES - 1);
            for (let k = 0; k < r.length; k++) {
                const view = r.view(k)!;
                if (view.level === null || view.done) {
                    expect(view.arcs, `${name} step ${k}: no beach line before the first event and after the last`).toEqual([]);
                    continue;
                }
                const at = `${name} step ${k}`;
                steps++;
                expect(view.arcs.length, at).toBe(view.state.beach.length);
                expect(view.arcs.length, at).toBeGreaterThan(0);
                // every arc with a polyline inside the box is sampled at ARC_SAMPLES points, or is a pointed vertical segment
                const drawn = view.arcs.filter(arc => arc.xs.length > 0);
                expect(drawn.length, `${at}: an empty polyline`).toBeGreaterThan(0);
                const pointed = (arc: ArcDraw) => arc.xs.length === 2 && arc.xs[0] === arc.xs[1];
                for (const arc of drawn) {
                    expect(arc.ys.length, at).toBe(arc.xs.length);
                    for (const v of [...arc.xs, ...arc.ys]) expect(Number.isFinite(v), at).toBe(true);
                    if (pointed(arc)) { pointedArcs++; continue; }
                    expect(arc.xs.length, at).toBe(ARC_SAMPLES);
                    for (let i = 1; i < arc.xs.length; i++) {
                        expect(arc.xs[i] - arc.xs[i - 1], at).toBeGreaterThan(0);
                        expect(arc.xs[i] - arc.xs[i - 1], `${at}: gap above the sampling step`).toBeLessThanOrEqual(sampling + X_TOLERANCE);
                    }
                }
                // the arcs together cover [minX, maxX]: sort the x intervals and require no gap. While a site lies on the sweep
                // line its pointed arc is a vertical segment and the sweep line itself closes the picture, so the cover is
                // required only when every arc is a parabola arc.
                const spans = drawn.map(arc => [Math.min(...arc.xs), Math.max(...arc.xs)] as const).sort((a, b) => a[0] - b[0]);
                if (!drawn.some(pointed)) {
                    covered++;
                    expect(spans[0][0], `${at}: starts at the left edge`).toBeCloseTo(minX, 9);
                    let reach = spans[0][1];
                    for (const [from, to] of spans.slice(1)) {
                        expect(from - reach, `${at}: a gap in the beach line`).toBeLessThanOrEqual(X_TOLERANCE);
                        reach = Math.max(reach, to);
                    }
                    expect(reach, `${at}: reaches the right edge`).toBeCloseTo(maxX, 9);
                }
                // consecutive drawn arcs meet at the shared breakpoint
                for (let m = 0; m + 1 < drawn.length; m++) {
                    const [a, b] = [drawn[m], drawn[m + 1]];
                    if (pointed(a) && pointed(b)) continue; // two sites on the sweep line: the line itself joins them
                    const end = pointed(a) ? 1 : a.xs.length - 1;
                    const start = pointed(b) ? 1 : 0;
                    expect(Math.abs(a.xs[end] - b.xs[start]), `${at}: arcs ${a.site} and ${b.site} meet in x`).toBeLessThanOrEqual(X_TOLERANCE);
                    if (!pointed(a) && !pointed(b)) {
                        expect(Math.abs(a.ys[end] - b.ys[start]), `${at}: arcs ${a.site} and ${b.site} meet in y`)
                            .toBeLessThanOrEqual(JOIN_TOLERANCE * (1 + Math.abs(a.ys[end])));
                        junctions++;
                    }
                }
            }
        }
        // not vacuous: many steps, many joined non-pointed arcs, and pointed arcs from the equal-height set
        expect(steps).toBeGreaterThan(30);
        expect(junctions).toBeGreaterThan(40);
        expect(pointedArcs).toBeGreaterThan(0);
        expect(covered).toBeGreaterThan(20);
    });

    test('a breakpoint marker lies on both neighbouring parabolas', () => {
        for (const {name, sites} of sets) {
            const r = runFortune(sites);
            for (let k = 0; k < r.length; k++) {
                const view = r.view(k)!;
                if (view.level === null || view.done) continue;
                for (const bp of view.breakpoints) {
                    for (const s of [view.state.beach[view.breakpoints.indexOf(bp)], view.state.beach[view.breakpoints.indexOf(bp) + 1]]) {
                        const site = r.sites[s];
                        if (site.y - view.level <= 1e-9) continue;
                        const y = parabolaY(site, view.level, bp.at.x);
                        expect(Math.abs(y - bp.at.y), `${name} step ${k}`).toBeLessThanOrEqual(JOIN_TOLERANCE * (1 + Math.abs(y)));
                    }
                }
            }
        }
    });
});

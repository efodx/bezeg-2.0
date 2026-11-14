import {expect, it} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {GUIDED_EXAMPLE_PREVIEW_IDS, getGuidedExamplePreviewCopy, resolveGuidedExamplePreview} from './guidedExamplePreviews';
import {retainedExampleHomes} from './retainedExamples';
import {resolveGuidedExample} from './guidedExamples';
import {getChapterOwnedLessons} from '../content/chapterOwnedLessons';
import {linearMapsPreviewCopy} from '../content/linearMapsPreviewCopy';
import {complexMapsPreviewCopy} from '../content/complexMapsPreviewCopy';
import {numericalPreviewCopy} from '../content/numericalPreviewCopy';
import {schoolFunctionGraphsPreviewCopy} from '../content/schoolFunctionGraphsPreviewCopy';
import {fourierPreviewCopy} from '../content/fourierPreviewCopy';
import {projectiveConicsPreviewCopy} from '../content/projectiveConicsPreviewCopy';
import {curveGeometryPreviewCopy} from '../content/curveGeometryPreviewCopy';
import {advancedBezierPreviewCopy} from '../content/advancedBezierPreviewCopy';
import {convexityPreviewCopy} from '../content/convexityPreviewCopy';
import {triangulationPreviewCopy} from '../content/triangulationPreviewCopy';
import {sweepPreviewCopy} from '../content/sweepPreviewCopy';
import {trianglePreviewCopy} from '../content/trianglePreviewCopy';
import {interpolationPreviewCopy} from '../content/interpolationPreviewCopy';
import {probabilityPreviewCopy} from '../content/probabilityPreviewCopy';
import {bsplinePreviewCopy} from '../content/bsplinePreviewCopy';
import {phasePortraitsPreviewCopy} from '../content/phasePortraitsPreviewCopy';
import {analyticLinesPreviewCopy} from '../content/analyticLinesPreviewCopy';
import {trigonometryPreviewCopy} from '../content/trigonometryPreviewCopy';

interface InventoryEntry {
    id: string;
    demonstrationId: string;
    path: string;
    sceneFingerprint: string;
    recipe?: {kind: string};
    recipeFingerprint?: string;
    actions: string[];
    expected?: unknown;
}

interface Capture extends InventoryEntry {
    file: string;
    sha256: string;
    width: number;
    height: number;
    initialFrame: {firstFrame: boolean; backNavigationDisabled: boolean; stableAcrossMs: number};
    framing: {boardOnly: boolean; guidedLessonOverlayHidden: boolean};
    captureEvidence: {servedBuildVerified: boolean; pageErrors: string[]};
}

it('publishes every exact prepared scene with checked PNG bytes and bilingual resolver media', () => {
    const destination = resolve('src/images/learning/examples');
    const inventory: {examples: InventoryEntry[]} = JSON.parse(readFileSync(
        resolve('docs/reviews/illustrated-chapter-examples/capture-inventory.json'), 'utf8'));
    const manifest: {captures: Capture[]; fingerprints: {inventory: string}; sourceRevision: string} = JSON.parse(
        readFileSync(resolve(destination, 'manifest.json'), 'utf8'));
    const ids = retainedExampleHomes.map(home => home[0]).sort();
    expect(inventory.examples.map(entry => entry.id).sort()).toEqual(ids);
    expect(manifest.captures.map(entry => entry.id).sort()).toEqual(ids);
    expect(readdirSync(destination).filter(file => file.endsWith('.png')).sort()).toEqual(ids.map(id => `${id}.png`).sort());
    expect(manifest.sourceRevision).toMatch(/^[a-f0-9]{40}$/);
    const inventoryHash = createHash('sha256');
    for (const entry of [...inventory.examples].sort((a, b) => a.id.localeCompare(b.id))) {
        inventoryHash.update(JSON.stringify({id: entry.id, demonstrationId: entry.demonstrationId, path: entry.path,
            sceneFingerprint: entry.sceneFingerprint, actions: entry.actions || [], expected: entry.expected || null,
            // Mirrors the runner: start recipes are omitted, highlight recipes are covered by their fingerprint.
            recipe: entry.recipe?.kind === 'highlight' ? entry.recipeFingerprint : undefined}));
        inventoryHash.update('\0');
    }
    expect(manifest.fingerprints.inventory).toBe(inventoryHash.digest('hex'));

    for (const [id, chapterId, sectionId, demonstrationId, , , path] of retainedExampleHomes) {
        const entry = inventory.examples.find(item => item.id === id);
        const capture = manifest.captures.find(item => item.id === id);
        expect(entry, id).toBeDefined();
        expect(capture, id).toBeDefined();
        if (!entry || !capture) throw new Error(`${id}: missing scene mapping`);
        const example = resolveGuidedExample(new URL(path, 'https://bezeg.invalid').search, demonstrationId);
        expect(example?.owner).toMatchObject({chapterId, sectionId});
        if (!example) throw new Error(`${id}: missing prepared example`);
        const step = example.lesson.steps[0];
        const fingerprint = createHash('sha256').update(JSON.stringify({demonstrationId, stepId: step.id,
            actions: step.scene?.actions, firstFrame: step.frames?.[0] ?? null})).digest('hex');
        expect(entry).toMatchObject({id, demonstrationId, path, sceneFingerprint: fingerprint});
        expect(entry.actions).toEqual(step.scene?.actions.map(action => `${action.kind}: ${JSON.stringify(action)}`));
        expect(capture).toMatchObject({id, demonstrationId, path, sceneFingerprint: fingerprint,
            actions: entry.actions, file: `${id}.png`, width: 840, height: 520,
            initialFrame: {firstFrame: true, backNavigationDisabled: true, stableAcrossMs: 250},
            framing: {boardOnly: true, guidedLessonOverlayHidden: true},
            captureEvidence: {servedBuildVerified: true, pageErrors: []}});
        const png = readFileSync(resolve(destination, capture.file));
        expect(png.subarray(0, 8).toString('hex'), id).toBe('89504e470d0a1a0a');
        expect([png.readUInt32BE(16), png.readUInt32BE(20)], id).toEqual([840, 520]);
        expect(createHash('sha256').update(png).digest('hex'), id).toBe(capture.sha256);
        for (const language of ['sl', 'en'] as const) {
            const preview = resolveGuidedExamplePreview(id, demonstrationId, language);
            expect(preview?.src, `${id}/${language}`).toBeTruthy();
            expect(preview?.alt.trim(), `${id}/${language}`).toBeTruthy();
            expect(preview?.caption.trim(), `${id}/${language}`).toBeTruthy();
        }
    }
});

it('has bilingual preview copy for every retained example and keeps special scenes specific', () => {
    expect(GUIDED_EXAMPLE_PREVIEW_IDS).toHaveLength(56);
    expect(new Set(GUIDED_EXAMPLE_PREVIEW_IDS).size).toBe(56);
    expect([...GUIDED_EXAMPLE_PREVIEW_IDS].sort()).toEqual(retainedExampleHomes.map(home => home[0]).sort());

    for (const [id, , , demonstrationId] of retainedExampleHomes) {
        const copy = getGuidedExamplePreviewCopy(id, demonstrationId);
        expect(copy, `${id} should have explicit preview copy`).toBeDefined();
        expect(copy?.alt.sl.trim(), `${id} Slovenian alt`).not.toBe('');
        expect(copy?.alt.en.trim(), `${id} English alt`).not.toBe('');
        expect(copy?.caption.sl.trim(), `${id} Slovenian caption`).not.toBe('');
        expect(copy?.caption.en.trim(), `${id} English caption`).not.toBe('');
    }

    const workedJoin = getGuidedExamplePreviewCopy('splines.worked-join.spline-c1.parabola-derivatives', 'spline-c1');
    expect(workedJoin?.alt.en).toContain('parabolic');
    expect(workedJoin?.caption.en).toContain('derivatives');
    const workedWeight = getGuidedExamplePreviewCopy('foundations.worked-weight.bernstein.degree-comparison', 'bernstein');
    expect(workedWeight?.alt.en).toContain('three quadratic Bernstein basis functions');
    expect(workedWeight?.caption.en).toContain('middle weight peaks at the interval midpoint');
    expect(workedWeight?.caption.en).toContain('stacked view is off');
    expect(workedWeight?.caption.en).not.toContain('degree three');
    expect(workedWeight?.alt.sl).toContain('treh kvadratnih Bernsteinovih baznih funkcij');
    expect(workedWeight?.caption.sl).toContain('naloženi prikaz je izklopljen');
});

it('publishes the Linear maps example cards with their own checked images and per-section copy', () => {
    const chapterId = 'linear-maps';
    const destination = resolve('src/images/learning/examples', chapterId);
    const owned = getChapterOwnedLessons(chapterId);
    if (!owned) throw new Error('linear-maps is not chapter-owned');
    const homes = owned.rows().map(([sectionId, demonstrationId]) => ({
        id: `${chapterId}.${sectionId}.${demonstrationId}`, sectionId, demonstrationId,
        path: owned.path(sectionId) ?? ''}));
    const ids = homes.map(home => home.id).sort();
    expect(ids).toEqual(['linear-maps.determinant-area.linear-map', 'linear-maps.eigen-directions.linear-map', 'linear-maps.matrix-and-image.linear-map', 'linear-maps.singular-ellipse.linear-map', 'linear-maps.composition-affine.linear-map', 'linear-maps.power-method.linear-map', 'linear-maps.trace-determinant.linear-map'].sort());
    expect(Object.keys(linearMapsPreviewCopy).sort()).toEqual(ids);
    const inventory: {examples: (InventoryEntry & {expected: {types: object; curveCount: number; points: unknown[]}})[]} = JSON.parse(
        readFileSync(resolve('docs/reviews', chapterId, 'guided-example-inventory.json'), 'utf8'));
    const manifest: {captures: Capture[]} = JSON.parse(readFileSync(resolve(destination, 'manifest.json'), 'utf8'));
    expect(inventory.examples.map(entry => entry.id).sort()).toEqual(ids);
    expect(manifest.captures.map(entry => entry.id).sort()).toEqual(ids);
    expect(readdirSync(destination).filter(file => file.endsWith('.png')).sort()).toEqual(ids.map(id => `${id}.png`));
    for (const home of homes) {
        const entry = inventory.examples.find(item => item.id === home.id);
        const capture = manifest.captures.find(item => item.id === home.id);
        if (!entry || !capture) throw new Error(`${home.id}: missing mapping`);
        const example = resolveGuidedExample(new URL(home.path, 'https://bezeg.invalid').search, home.demonstrationId);
        expect(example?.owner).toMatchObject({chapterId, sectionId: home.sectionId});
        const step = example?.lesson.steps[0];
        if (!step) throw new Error(`${home.id}: missing prepared example`);
        expect(entry).toMatchObject({id: home.id, path: home.path, recipe: {kind: 'start'}});
        expect(entry.actions).toEqual(step.scene?.actions.map(action => `${action.kind}: ${JSON.stringify(action)}`));
        expect(entry.expected.curveCount).toBeGreaterThan(0);
        expect(entry.expected.points.length).toBeGreaterThan(0);
        expect(capture).toMatchObject({file: `${home.id}.png`, width: 840, height: 520, path: home.path,
            initialFrame: {firstFrame: true, backNavigationDisabled: true},
            framing: {boardOnly: true, guidedLessonOverlayHidden: true}, captureEvidence: {servedBuildVerified: true, pageErrors: []}});
        const png = readFileSync(resolve(destination, capture.file));
        expect(createHash('sha256').update(png).digest('hex')).toBe(capture.sha256);
        for (const language of ['sl', 'en'] as const) {
            const preview = resolveGuidedExamplePreview(home.id, home.demonstrationId, language);
            expect(preview?.src, `${home.id}/${language}`).toBeTruthy();
            expect(preview?.alt.trim()).toBeTruthy();
            expect(preview?.caption.trim()).toBeTruthy();
        }
    }
    // L1 to L4 share a Demonstration but not a card.
    for (const language of ['sl', 'en'] as const) {
        expect(resolveGuidedExamplePreview(ids[0], 'linear-map', language)?.caption)
            .not.toBe(resolveGuidedExamplePreview(ids[1], 'linear-map', language)?.caption);
    }
});

it('publishes the Complex maps example cards with their own checked images and per-section copy', () => {
    const chapterId = 'complex-maps';
    const destination = resolve('src/images/learning/examples', chapterId);
    const owned = getChapterOwnedLessons(chapterId);
    if (!owned) throw new Error('complex-maps is not chapter-owned');
    const homes = owned.rows().map(([sectionId, demonstrationId]) => ({
        id: `${chapterId}.${sectionId}.${demonstrationId}`, sectionId, demonstrationId,
        path: owned.path(sectionId) ?? ''}));
    const ids = homes.map(home => home.id).sort();
    expect(ids).toEqual(['complex-maps.reciprocal-inversion.complex-reciprocal', 'complex-maps.roots.complex-roots']);
    expect(Object.keys(complexMapsPreviewCopy).sort()).toEqual(ids);
    const inventory: {examples: (InventoryEntry & {expected: {types: object; curveCount: number; points: unknown[]}})[]} = JSON.parse(
        readFileSync(resolve('docs/reviews', chapterId, 'guided-example-inventory.json'), 'utf8'));
    const manifest: {captures: Capture[]} = JSON.parse(readFileSync(resolve(destination, 'manifest.json'), 'utf8'));
    expect(inventory.examples.map(entry => entry.id).sort()).toEqual(ids);
    expect(manifest.captures.map(entry => entry.id).sort()).toEqual(ids);
    expect(readdirSync(destination).filter(file => file.endsWith('.png')).sort()).toEqual(ids.map(id => `${id}.png`));
    for (const home of homes) {
        const entry = inventory.examples.find(item => item.id === home.id);
        const capture = manifest.captures.find(item => item.id === home.id);
        if (!entry || !capture) throw new Error(`${home.id}: missing mapping`);
        const example = resolveGuidedExample(new URL(home.path, 'https://bezeg.invalid').search, home.demonstrationId);
        expect(example?.owner).toMatchObject({chapterId, sectionId: home.sectionId});
        const step = example?.lesson.steps[0];
        if (!step) throw new Error(`${home.id}: missing prepared example`);
        expect(entry).toMatchObject({id: home.id, path: home.path, recipe: {kind: 'start'}});
        expect(entry.actions).toEqual(step.scene?.actions.map(action => `${action.kind}: ${JSON.stringify(action)}`));
        expect(entry.expected.curveCount).toBeGreaterThan(0);
        expect(entry.expected.points.length).toBeGreaterThan(0);
        expect(capture).toMatchObject({file: `${home.id}.png`, width: 840, height: 520, path: home.path,
            initialFrame: {firstFrame: true, backNavigationDisabled: true},
            framing: {boardOnly: true, guidedLessonOverlayHidden: true}, captureEvidence: {servedBuildVerified: true, pageErrors: []}});
        const png = readFileSync(resolve(destination, capture.file));
        expect(createHash('sha256').update(png).digest('hex')).toBe(capture.sha256);
        for (const language of ['sl', 'en'] as const) {
            const preview = resolveGuidedExamplePreview(home.id, home.demonstrationId, language);
            expect(preview?.src, `${home.id}/${language}`).toBeTruthy();
            expect(preview?.alt.trim()).toBeTruthy();
            expect(preview?.caption.trim()).toBeTruthy();
        }
    }
    // The first frame of the reciprocal card shows z and w (3 points with the conjugate); the roots card only w.
    expect(inventory.examples.map(entry => [entry.id, entry.expected.curveCount, entry.expected.points.length]).sort())
        .toEqual([[ids[0], 3, 3], [ids[1], 1, 1]]);
});

type FunctionsCard = {
    chapterId: string; copy: object; ids: readonly string[]; counts: readonly (readonly [number, number])[];
    /** Owned homes whose card image is not captured yet. */
    pending?: readonly string[];
};
const functionsCards: readonly FunctionsCard[] = [
    {chapterId: 'numerical-methods', copy: numericalPreviewCopy, ids: ['numerical-methods.euler-method.euler-method', 'numerical-methods.quadrature.quadrature', 'numerical-methods.root-finding.root-finding'], counts: [[2, 1], [2, 2], [1, 3]]},
    {chapterId: 'school-function-graphs', copy: schoolFunctionGraphsPreviewCopy,
        ids: ['school-function-graphs.conic-focal.conic-focal', 'school-function-graphs.function-inverse.function-inverse', 'school-function-graphs.function-transformation.function-transformation',
            'school-function-graphs.geometric-series.geometric-series', 'school-function-graphs.polynomial-zeros.polynomial-zeros',
            'school-function-graphs.rational-function.rational-function'],
        counts: [[1, 3], [2, 2], [2, 2], [0, 0], [1, 2], [1, 4]]},
    {chapterId: 'fourier-series', copy: fourierPreviewCopy, ids: ['fourier-series.epicycles.epicycles', 'fourier-series.fourier-coefficients.fourier-coefficients', 'fourier-series.fourier-series.fourier-series'], counts: [[5, 12], [5, 7], [6, 7]]},
    {chapterId: 'projective-conics', copy: projectiveConicsPreviewCopy,
        ids: ['projective-conics.projective-cross-ratio.projective-cross-ratio', 'projective-conics.projective-five-point.projective-five-point',
            'projective-conics.projective-pascal.projective-pascal', 'projective-conics.projective-pole-polar.projective-pole-polar',
            'projective-conics.projective-three-views.projective-three-views'],
        counts: [[0, 11], [3, 9], [1, 8], [1, 4], [5, 0]]},
    {chapterId: 'curve-geometry', copy: curveGeometryPreviewCopy,
        ids: ['curve-geometry.curve-comb.curve-comb', 'curve-geometry.curve-curvature.curve-curvature', 'curve-geometry.curve-envelope.curve-envelope',
            'curve-geometry.curve-evolute.curve-evolute', 'curve-geometry.curve-offset.curve-offset', 'curve-geometry.curve-parametric.curve-parametric'],
        counts: [[1, 4], [1, 5], [1, 3], [1, 6], [2, 3], [0, 2]]},
    // patch-coons is a surface card: its count row is its one rendered owner and no board points.
    {chapterId: 'advanced-bezier', copy: advancedBezierPreviewCopy,
        ids: ['advanced-bezier.arc-length-param.arc-length-param', 'advanced-bezier.bezier-clipping.bezier-clipping', 'advanced-bezier.patch-coons.patch-coons', 'advanced-bezier.reduction.reduction'],
        counts: [[1, 14], [4, 6], [1, 0], [3, 11]]},
    {chapterId: 'convexity-hulls', copy: convexityPreviewCopy,
        ids: ['convexity-hulls.bezier-hulls.bezier-hulls', 'convexity-hulls.convex-hull.convex-hull', 'convexity-hulls.hull-robustness.hull-robustness',
            'convexity-hulls.orientation.orientation', 'convexity-hulls.point-in-polygon.point-in-polygon', 'convexity-hulls.polygon-area.polygon-area'],
        counts: [[4, 6], [2, 9], [2, 3], [0, 2], [0, 6], [2, 5]]},
    {chapterId: 'triangulations-voronoi', copy: triangulationPreviewCopy,
        ids: ['triangulations-voronoi.delaunay.delaunay', 'triangulations-voronoi.ear-clipping.ear-clipping',
            'triangulations-voronoi.point-set-triangulation.point-set-triangulation', 'triangulations-voronoi.voronoi-degenerate.voronoi-degenerate',
            'triangulations-voronoi.voronoi.voronoi'],
        counts: [[6, 4], [0, 6], [0, 7], [0, 5], [0, 8]]},
    {chapterId: 'sweep-algorithms', copy: sweepPreviewCopy,
        ids: ['sweep-algorithms.fortune.fortune', 'sweep-algorithms.interval-sweep.interval-sweep', 'sweep-algorithms.monotone-partition.monotone-partition',
            'sweep-algorithms.monotone-triangulation.monotone-triangulation', 'sweep-algorithms.segment-intersections.segment-intersections'],
        counts: [[1, 4], [2, 10], [1, 6], [5, 11], [0, 8]]},
    {chapterId: 'triangle-geometry', copy: trianglePreviewCopy,
        ids: ['triangle-geometry.euler-line.euler-line', 'triangle-geometry.inscribed-angle.inscribed-angle', 'triangle-geometry.inversion.inversion',
            'triangle-geometry.notable-points.triangle-centres', 'triangle-geometry.simson-line.simson-line'],
        counts: [[0, 6], [3, 5], [0, 5], [0, 4], [0, 8]]},
    {chapterId: 'interpolation', copy: interpolationPreviewCopy,
        ids: ['interpolation.hermite.interp-hermite', 'interpolation.lagrange.interp-lagrange', 'interpolation.least-squares.interp-least-squares',
            'interpolation.runge.interp-runge', 'interpolation.subdivision.interp-subdivision'],
        counts: [[1, 8], [1, 5], [2, 4], [2, 7], [2, 8]]},
    {chapterId: 'probability', copy: probabilityPreviewCopy,
        ids: ['probability.binomial-normal.prob-binomial-normal', 'probability.clt.prob-clt', 'probability.correlation.prob-correlation',
            'probability.density.prob-density', 'probability.summary.prob-summary'],
        counts: [[4, 1], [2, 0], [1, 4], [2, 2], [0, 9]]},
    {chapterId: 'b-splines', copy: bsplinePreviewCopy,
        ids: ['b-splines.bspline-basis.bspline-basis', 'b-splines.bspline-blossom.bspline-blossom', 'b-splines.bspline-deboor.bspline-deboor',
            'b-splines.bspline-extraction.bspline-extraction', 'b-splines.bspline-insertion.bspline-insertion', 'b-splines.bspline-nurbs.bspline-nurbs'],
        counts: [[3, 8], [1, 7], [1, 7], [5, 4], [3, 4], [2, 10]]},
    {chapterId: 'phase-portraits', copy: phasePortraitsPreviewCopy,
        ids: ['phase-portraits.bifurcation.logistic-map', 'phase-portraits.linear-system.phase-portrait', 'phase-portraits.linearization.phase-portrait',
            'phase-portraits.logistic-map.logistic-map', 'phase-portraits.pendulum.phase-portrait'],
        counts: [[7, 2], [3, 5], [3, 5], [7, 3], [3, 5]]},
    {chapterId: 'trigonometry', copy: trigonometryPreviewCopy,
        ids: ['trigonometry.addition-formulas.unit-circle', 'trigonometry.cosine-rule.triangle-solver', 'trigonometry.radian-sine-cosine.unit-circle',
            'trigonometry.sine-rule.triangle-solver'],
        counts: [[2, 5], [0, 3], [1, 2], [0, 3]]},
    {chapterId: 'analytic-lines', copy: analyticLinesPreviewCopy,
        ids: ['analytic-lines.angle-between-lines.line-geometry', 'analytic-lines.distance-point-line.line-geometry', 'analytic-lines.forms-of-a-line.line-geometry',
            'analytic-lines.normal-parallel-perpendicular.line-geometry'],
        counts: [[1, 5], [0, 4], [0, 2], [0, 4]]},
];

for (const {chapterId, copy, ids: expectedIds, counts, pending = []} of functionsCards) {
    it(`publishes the ${chapterId} example cards with their own checked images and copy`, () => {
        const destination = resolve('src/images/learning/examples', chapterId);
        const owned = getChapterOwnedLessons(chapterId);
        if (!owned) throw new Error(`${chapterId} is not chapter-owned`);
        const allHomes = owned.rows().map(([sectionId, demonstrationId]) => ({
            id: `${chapterId}.${sectionId}.${demonstrationId}`, sectionId, demonstrationId,
            path: owned.path(sectionId) ?? ''}));
        expect(allHomes.filter(home => pending.includes(home.id)).map(home => home.id).sort()).toEqual([...pending].sort());
        const homes = allHomes.filter(home => !pending.includes(home.id));
        const ids = homes.map(home => home.id).sort();
        expect(ids).toEqual([...expectedIds]);
        expect(Object.keys(copy).sort()).toEqual(ids);
        const inventory: {examples: (InventoryEntry & {expected: {types?: object; curveCount?: number; points?: unknown[]; curves?: unknown[]; surface?: {owners: unknown[]}}})[]} = JSON.parse(
            readFileSync(resolve('docs/reviews', chapterId, 'guided-example-inventory.json'), 'utf8'));
        const manifest: {captures: Capture[]} = JSON.parse(readFileSync(resolve(destination, 'manifest.json'), 'utf8'));
        expect(inventory.examples.map(entry => entry.id).sort()).toEqual(ids);
        expect(manifest.captures.map(entry => entry.id).sort()).toEqual(ids);
        expect(readdirSync(destination).filter(file => file.endsWith('.png')).sort()).toEqual(ids.map(id => `${id}.png`));
        for (const home of homes) {
            const entry = inventory.examples.find(item => item.id === home.id);
            const capture = manifest.captures.find(item => item.id === home.id);
            if (!entry || !capture) throw new Error(`${home.id}: missing mapping`);
            const example = resolveGuidedExample(new URL(home.path, 'https://bezeg.invalid').search, home.demonstrationId);
            expect(example?.owner).toMatchObject({chapterId, sectionId: home.sectionId});
            const step = example?.lesson.steps[0];
            if (!step) throw new Error(`${home.id}: missing prepared example`);
            expect(entry).toMatchObject({id: home.id, path: home.path, recipe: {kind: 'start'}});
            expect(entry.actions).toEqual(step.scene?.actions.map(action => `${action.kind}: ${JSON.stringify(action)}`));
            const surface = entry.expected.surface !== undefined;
            if (!surface) {
                expect(entry.expected.curveCount).toBeGreaterThanOrEqual(0);
                // A first frame with no visible point (K5 at c = 2) is checked by its authored curve samples instead, and the S5 bars
                // (segments only) by their authored segment count.
                expect((entry.expected.points?.length ?? 0) + (entry.expected.curves?.length ?? 0)
                    + Object.values(entry.expected.types as Record<string, number>).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
            }
            expect(capture).toMatchObject({file: `${home.id}.png`, width: 840, height: 520, path: home.path,
                initialFrame: {firstFrame: true, backNavigationDisabled: true},
                framing: {...(surface ? {surfaceHostOnly: true} : {boardOnly: true}), guidedLessonOverlayHidden: true}, captureEvidence: {servedBuildVerified: true, pageErrors: []}});
            const png = readFileSync(resolve(destination, capture.file));
            expect(createHash('sha256').update(png).digest('hex')).toBe(capture.sha256);
            for (const language of ['sl', 'en'] as const) {
                const preview = resolveGuidedExamplePreview(home.id, home.demonstrationId, language);
                expect(preview?.src, `${home.id}/${language}`).toBeTruthy();
                expect(preview?.alt.trim()).toBeTruthy();
                expect(preview?.caption.trim()).toBeTruthy();
            }
        }
        // Authored first-frame sizes: curves and board points, or the rendered owners of a surface.
        expect(ids.map(id => {
            const expected = inventory.examples.find(entry => entry.id === id)?.expected;
            if (expected?.surface) return [expected.surface.owners.length, 0];
            return [expected?.curveCount, (expected?.types as Record<string, number>).point ?? 0];
        })).toEqual(counts.map(([curves, points]) => [curves, points]));
    });
}

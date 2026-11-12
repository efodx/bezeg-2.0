/**
 * SV1 and SV2 (solids, batch A): every scene lands in the state and readouts the text states (the real solids graph, scenes applied in one synchronous `act` from a restored
 * checkpoint, out of order and twice, in sl and en). The mathematics is recomputed here without `src/solids`: the section of a convex polytope given by its vertices and edges
 * (the cut points on the edges, the convex hull of them, the 3D area from the projected hull), the volume of the lower part by slicing and clipping a square, and the area as
 * |n| dV/dd. The numbers each step quotes, the offsets and normals it prompts, the worked examples and the chapter prose are checked against those values in sl (decimal comma)
 * and en (decimal point), and the lesson sources are scanned for single-backslash math delimiters.
 */
import {readFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {act} from '@testing-library/react';
import {sceneActions} from '../runtime/lessonCatalog';
import {cubeSectionsLesson, prismPyramidSectionsLesson} from './solidsGuidedLessons';
import {solidsChapter} from './solidsChapter';
import {familyChapters} from './familyChapters';
import {getChapterOwnedLessons} from './chapterOwnedLessons';
import type {LessonAction} from '../model';
import type {GuidedLesson} from './guidedLessons';
import {createGraph, installBoardShims, mountGraph, REAL_GRAPH_TEST_TIMEOUT} from '../../graphs/base/realGraphTestHarness';
import SolidsGraph from '../../graphs/solids/SolidsGraph';
import {setLanguage} from '../../localization';

vi.setConfig({testTimeout: REAL_GRAPH_TEST_TIMEOUT});
beforeAll(installBoardShims);
beforeEach(() => {
    window.localStorage.clear();
    setLanguage('sl');
});

// ---- the independent mathematics --------------------------------------------------------------------------------------------------------

type Vec = readonly [number, number, number];
type SolidName = 'cube' | 'square-prism' | 'square-pyramid';
interface Polytope { readonly vertices: readonly Vec[]; readonly edges: readonly (readonly [number, number])[] }

const hamming = (a: Vec, b: Vec) => a.filter((value, i) => value !== b[i]).length;
const edgesByHamming = (vertices: readonly Vec[]) => vertices.flatMap((a, i) => vertices.map((b, j) => [i, j] as const).filter(([, j]) => j > i && hamming(a, vertices[j]) === 1));
const cubeVertices: Vec[] = [0, 1].flatMap(x => [0, 1].flatMap(y => [0, 1].map(z => [x, y, z] as Vec)));
const prismVertices: Vec[] = [-1, 1].flatMap(x => [-1, 1].flatMap(y => [-1.5, 1.5].map(z => [x, y, z] as Vec)));
const pyramidVertices: Vec[] = [...[-2, 2].flatMap(x => [-2, 2].map(y => [x, y, -2] as Vec)), [0, 0, 2]];
const POLYTOPES: Record<SolidName, Polytope> = {
    'cube': {vertices: cubeVertices, edges: edgesByHamming(cubeVertices)},
    'square-prism': {vertices: prismVertices, edges: edgesByHamming(prismVertices)},
    // the base square (vertices 0..3: (-2,-2), (-2,2), (2,-2), (2,2)) has the edges between the corners that share a coordinate; the four lateral edges meet at the apex 4
    'square-pyramid': {vertices: pyramidVertices, edges: [[0, 1], [0, 2], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [3, 4]]},
};
/** The solid as a stack of squares (centre, half width) over z, for the volume of the lower part. */
const SLICES: Record<SolidName, {zLow: number; zHigh: number; centre: (z: number) => [number, number]; half: (z: number) => number; volume: number}> = {
    'cube': {zLow: 0, zHigh: 1, centre: () => [0.5, 0.5], half: () => 0.5, volume: 1},
    'square-prism': {zLow: -1.5, zHigh: 1.5, centre: () => [0, 0], half: () => 1, volume: 12},
    'square-pyramid': {zLow: -2, zHigh: 2, centre: () => [0, 0], half: z => (2 - z) / 2, volume: 64 / 3},
};

const dot = (n: Vec, p: Vec) => n[0] * p[0] + n[1] * p[1] + n[2] * p[2];
const EPS = 1e-9;

interface Section { readonly points: readonly Vec[]; readonly hull: readonly (readonly [number, number])[]; readonly area: number }
function hull2d(points: readonly (readonly [number, number])[]): (readonly [number, number])[] {
    const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length < 3) return sorted;
    const cross = (o: readonly [number, number], a: readonly [number, number], b: readonly [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const build = (items: readonly (readonly [number, number])[]) => {
        const chain: (readonly [number, number])[] = [];
        for (const p of items) {
            while (chain.length >= 2 && cross(chain[chain.length - 2], chain[chain.length - 1], p) <= EPS) chain.pop();
            chain.push(p);
        }
        chain.pop();
        return chain;
    };
    const lower = build(sorted);
    const upper = build(sorted.slice().reverse());
    return [...lower, ...upper];
}
/** The section of the polytope by n . x = d: the cut points on the edges (and the vertices on the plane), their convex hull and its 3D area. */
function sectionOf(solid: SolidName, n: Vec, d: number): Section {
    const {vertices, edges} = POLYTOPES[solid];
    const points: Vec[] = [];
    const add = (p: Vec) => { if (!points.some(q => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) < 1e-7)) points.push(p); };
    for (const [i, j] of edges) {
        const a = vertices[i];
        const b = vertices[j];
        const sa = dot(n, a) - d;
        const sb = dot(n, b) - d;
        if (Math.abs(sa) < EPS) add(a);
        if (Math.abs(sb) < EPS) add(b);
        if (sa * sb < -EPS * EPS) { const s = sa / (sa - sb); add([a[0] + s * (b[0] - a[0]), a[1] + s * (b[1] - a[1]), a[2] + s * (b[2] - a[2])]); }
    }
    // drop the coordinate with the largest normal component and project
    const k = [0, 1, 2].reduce((best, i) => Math.abs(n[i]) > Math.abs(n[best]) ? i : best, 0);
    const keep = [0, 1, 2].filter(i => i !== k);
    const hull = hull2d(points.map(p => [p[keep[0]], p[keep[1]]] as const));
    let twice = 0;
    for (let i = 0; i < hull.length; i += 1) { const a = hull[i]; const b = hull[(i + 1) % hull.length]; twice += a[0] * b[1] - b[0] * a[1]; }
    const projected = hull.length >= 3 ? Math.abs(twice) / 2 : 0;
    return {points, hull, area: projected * Math.hypot(...n) / Math.abs(n[k])};
}
/** The area of a square clipped by a x + b y <= c (Sutherland-Hodgman against one half plane). */
function clippedSquare(centre: readonly [number, number], half: number, a: number, b: number, c: number): number {
    let polygon: [number, number][] = [[centre[0] - half, centre[1] - half], [centre[0] + half, centre[1] - half], [centre[0] + half, centre[1] + half], [centre[0] - half, centre[1] + half]];
    const inside = (p: readonly [number, number]) => a * p[0] + b * p[1] <= c;
    const output: [number, number][] = [];
    for (let i = 0; i < polygon.length; i += 1) {
        const p = polygon[i];
        const q = polygon[(i + 1) % polygon.length];
        if (inside(p)) output.push(p);
        if (inside(p) !== inside(q)) {
            const sp = a * p[0] + b * p[1] - c;
            const sq = a * q[0] + b * q[1] - c;
            const s = sp / (sp - sq);
            output.push([p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1])]);
        }
    }
    polygon = output;
    let twice = 0;
    for (let i = 0; i < polygon.length; i += 1) { const p = polygon[i]; const q = polygon[(i + 1) % polygon.length]; twice += p[0] * q[1] - q[0] * p[1]; }
    return Math.abs(twice) / 2;
}
/** The volume of the part with n . x <= d, by midpoint integration of the clipped squares over z. */
function keptVolume(solid: SolidName, n: Vec, d: number): number {
    const {zLow, centre, half} = SLICES[solid];
    // a horizontal plane makes the integrand a step in z: integrate up to the plane (n3 > 0) so that the midpoint rule is exact at the step
    const zHigh = n[0] === 0 && n[1] === 0 ? Math.max(zLow, Math.min(SLICES[solid].zHigh, d / n[2])) : SLICES[solid].zHigh;
    const count = 20000;
    const h = (zHigh - zLow) / count;
    let sum = 0;
    for (let i = 0; i < count; i += 1) {
        const z = zLow + (i + 0.5) * h;
        sum += clippedSquare(centre(z), half(z), n[0], n[1], d - n[2] * z) * h;
    }
    return sum;
}
/** The area as |n| dV/dd (central difference); close to the hull area except within a step of the offsets where the combinatorics changes. */
const areaByDerivative = (solid: SolidName, n: Vec, d: number) => Math.hypot(...n) * (keptVolume(solid, n, d + 1e-3) - keptVolume(solid, n, d - 1e-3)) / 2e-3;

// ---- formats ------------------------------------------------------------------------------------------------------------------------------

type Language = 'sl' | 'en';
const q = (value: number, digits: number, language: Language) => { const s = String(Number(value.toFixed(digits))); return language === 'sl' ? s.replace('.', ',') : s; };
const prose = (text: string) => text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/\{,\}/g, ',').replace(/\\[ ,;]/g, ' ');
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasNumber = (text: string, value: string) => new RegExp(`(?<![0-9.,/])${escapeRegExp(value)}(?![0-9]|[.,/][0-9])`).test(prose(text));
const hasQuote = (text: string, value: number, digits: number, language: Language) =>
    hasNumber(text, q(value, digits, language)) || hasNumber(text, language === 'sl' ? value.toFixed(digits).replace('.', ',') : value.toFixed(digits));
const numberOf = (text: string | null) => Number((text ?? '').replace(/−/g, '-').replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0]);

// ---- the lessons and their scenes ---------------------------------------------------------------------------------------------------------

const lessons: readonly GuidedLesson[] = [cubeSectionsLesson, prismPyramidSectionsLesson];
const allSteps = () => lessons.flatMap(lesson => lesson.steps);
const stepOf = (id: string) => allSteps().find(step => step.id === id)!;

interface Config { readonly solid: SolidName; readonly normal: Vec; readonly D: number }
const cfg = (solid: SolidName, normal: Vec, D: number): Config => ({solid, normal, D});
const dOf = (config: Config) => config.D / 4;

/** The scene of each step: solid, normal, stored offset D = 4 d, written here independently of the scene constants of the lesson file. */
const SCENES: Record<string, Config> = {
    'sv1-parallel': cfg('cube', [0, 0, 1], 2),
    'sv1-tilt': cfg('cube', [1, 1, 0], 4),
    'sv1-diagonal': cfg('cube', [1, 1, 1], 2),
    'sv1-corners': cfg('cube', [1, 1, 1], 5),
    'sv1-argument': cfg('cube', [2, 3, 4], 16),
    'sv1-free': cfg('cube', [1, 1, 1], 6),
    'sv2-prism': cfg('square-prism', [0, 0, 1], 0),
    'sv2-pyramid': cfg('square-pyramid', [0, 0, 1], -4),
    'sv2-similar': cfg('square-pyramid', [0, 0, 1], 0),
    'sv2-apex': cfg('square-pyramid', [1, 0, 0], 0),
    'sv2-pentagon': cfg('square-pyramid', [1, 1, 1], 0),
    'sv2-free': cfg('square-pyramid', [1, 1, 1], -4),
};
const stepIds = Object.keys(SCENES);

/** The configurations each step prompts (besides its scene), each with the sides and the corner rows (as sorted vertex lists) the text states. */
interface Prompted extends Config { readonly sides: number; readonly corners?: readonly string[] }
const P = (solid: SolidName, normal: Vec, D: number, sides: number, corners?: readonly string[]): Prompted => ({...cfg(solid, normal, D), sides, corners});
const PROMPTED: Record<string, readonly Prompted[]> = {
    'sv1-parallel': [P('cube', [0, 0, 1], 2, 4), P('cube', [0, 0, 1], 1, 4)],
    'sv1-tilt': [P('cube', [1, 1, 0], 4, 4, ['2', '3', '6', '7']), P('cube', [1, 2, 2], 6, 4, ['1,5', '2,6', '2,4', '1,3'])],
    'sv1-diagonal': [P('cube', [1, 1, 1], 2, 3), P('cube', [1, 1, 1], 4, 3), P('cube', [1, 1, 1], 5, 6), P('cube', [1, 1, 1], 6, 6), P('cube', [1, 1, 1], 8, 3), P('cube', [1, 1, 1], 12, 1)],
    'sv1-corners': [P('cube', [1, 1, 1], 5, 6, ['3,7', '5,7', '5,6', '2,6', '2,4', '3,4']), P('cube', [1, 1, 1], 4, 3, ['2', '3', '5'])],
    'sv1-argument': [P('cube', [2, 3, 4], 16, 5), P('cube', [2, 3, 4], 18, 6)],
    'sv2-prism': [P('square-prism', [0, 0, 1], -4, 4), P('square-prism', [0, 0, 1], 0, 4), P('square-prism', [0, 0, 1], 4, 4)],
    'sv2-pyramid': [P('square-pyramid', [0, 0, 1], -4, 4), P('square-pyramid', [0, 0, 1], 0, 4), P('square-pyramid', [0, 0, 1], 4, 4), P('square-pyramid', [0, 0, 1], -8, 4), P('square-pyramid', [0, 0, 1], 8, 1)],
    'sv2-apex': [P('square-pyramid', [1, 0, 0], 0, 3), P('square-pyramid', [1, 1, 0], 0, 3), P('square-pyramid', [1, 2, 1], 8, 3), P('square-pyramid', [1, 0, 1], 8, 1)],
    'sv2-pentagon': [...[-7, -6, -4, -2, 0, 2, 4, 6, 7].map(D => P('square-pyramid', [1, 1, 1], D, 5)), P('square-pyramid', [1, 1, 1], -8, 3), P('square-pyramid', [1, 1, 1], 8, 2),
        P('square-pyramid', [2, 3, 4], 0, 5), P('square-pyramid', [1, 1, 2], 0, 4)],
};
const allPrompted = Object.entries(PROMPTED).flatMap(([id, configs]) => configs.map(config => ({id, config})));

// ---- the graph ----------------------------------------------------------------------------------------------------------------------------

const readout = (id: string) => document.querySelector(`[data-readout="${id}"] dd`)?.textContent ?? null;
const cornerRows = () => [...document.querySelectorAll('[data-readout^="corner-"] dd')].map(node => (node.textContent ?? '').match(/\d+/g)!.map(Number).sort((a, b) => a - b).join(','));

function mountSolids() {
    const graph = createGraph('solids');
    if (!(graph instanceof SolidsGraph)) throw new Error('solids must be the solids graph.');
    const mounted = mountGraph(graph);
    const capabilities = graph.getLessonCapabilities();
    const checkpoint = capabilities.captureState();
    const free = JSON.stringify(graph.state);
    const scene = (stepId: string, times = 1) => act(() => {
        capabilities.restoreState(checkpoint);
        for (let i = 0; i < times; i += 1) for (const action of sceneActions(stepOf(stepId).scene!)) capabilities.apply(action);
    });
    const learner = (...actions: LessonAction[]) => act(() => { for (const action of actions) capabilities.apply(action); });
    const restore = () => act(() => { capabilities.restoreState(checkpoint); });
    return {graph, mounted, capabilities, scene, learner, restore, free};
}
const setUp = (config: Config): LessonAction[] => [
    {kind: 'solids', operation: 'set-solid', solid: config.solid},
    {kind: 'solids', operation: 'set-mode', mode: 'section'},
    {kind: 'solids', operation: 'set-plane', normal: config.normal, offset: config.D},
];

/** The area, the kept volume and the side count of the current graph state against the independent recomputation. */
function checkReadouts(id: string, config: Config, sides?: number) {
    const d = dOf(config);
    const section = sectionOf(config.solid, config.normal, d);
    const kept = keptVolume(config.solid, config.normal, d);
    const close = (what: string, actual: number, expected: number, tolerance: number) => expect({id, what, ok: Math.abs(actual - expected) <= tolerance, actual, expected}).toEqual({id, what, ok: true, actual, expected});
    if (section.hull.length >= 3) {
        close('area', numberOf(readout('area')), section.area, 6e-6);
        close('sides', Number(readout('sides')), sides ?? section.hull.length, 0);
        expect({id, sides: section.hull.length}).toEqual({id, sides: sides ?? section.hull.length});
    }
    close('kept volume', numberOf(readout('kept-volume')), kept, 6e-6);
    close('solid volume', numberOf(readout('solid-volume')), SLICES[config.solid].volume, 6e-6);
}

for (const language of ['sl', 'en'] as const) {
    test(`${language}: every scene lands in the state and readouts the independent recomputation gives, in one synchronous act from a restored checkpoint, out of order and twice; leaving restores the free state`, () => {
        setLanguage(language);
        const m = mountSolids();
        try {
            for (const id of [...stepIds, ...stepIds.slice().reverse()]) {
                m.scene(id, 2);
                const config = SCENES[id];
                expect({id, state: {solid: m.graph.state.solid, mode: m.graph.state.mode, normal: [...m.graph.state.normal], offset: m.graph.state.offset}})
                    .toEqual({id, state: {solid: config.solid, mode: 'section', normal: [...config.normal], offset: config.D}});
                checkReadouts(id, config);
            }
            m.restore();
            expect(JSON.stringify(m.graph.state)).toBe(m.free);
        } finally {
            m.mounted.view.unmount();
        }
    });
}

test('the prompted configurations: on the control grid, text names their offset, the graph readouts equal the recomputation, the corner rows are the vertices the text names', () => {
    const m = mountSolids();
    try {
        for (const {id, config} of allPrompted) {
            const d = dOf(config);
            expect({id, onGrid: Number.isInteger(config.D) && config.normal.every(value => Number.isInteger(value) && Math.abs(value) <= 4) && config.normal.some(value => value !== 0)}).toEqual({id, onGrid: true});
            m.learner(...setUp(config));
            const sides = (PROMPTED[id].find(p => p === config) as Prompted).sides;
            checkReadouts(id, config, sides >= 3 ? sides : undefined);
            expect({id, d, normal: config.normal, hullSides: sectionOf(config.solid, config.normal, d).hull.length}).toEqual({id, d, normal: config.normal, hullSides: sides});
            const corners = (config as Prompted).corners;
            if (corners !== undefined) expect({id, d, rows: cornerRows().slice().sort()}).toEqual({id, d, rows: corners.slice().sort()});
        }
        m.restore();
    } finally {
        m.mounted.view.unmount();
    }
});

test('the independent recomputation agrees with itself: hull area against |n| dV/dd, and the area against closed forms', () => {
    for (const {id, config} of allPrompted) {
        const d = dOf(config);
        const section = sectionOf(config.solid, config.normal, d);
        if (section.hull.length < 3 || (config.normal[0] === 0 && config.normal[1] === 0 && (d === SLICES[config.solid].zLow || d === SLICES[config.solid].zHigh))) continue; // a plane in a base: one-sided derivative
        // the derivative is exact to O(step) next to the offsets where the combinatorics of the section changes (vertices of the solid on the plane)
        expect({id, d, ok: Math.abs(areaByDerivative(config.solid, config.normal, d) - section.area) < 2e-2}).toEqual({id, d, ok: true});
    }
    expect(sectionOf('cube', [0, 0, 1], 0.5).area).toBeCloseTo(1, 12);
    expect(sectionOf('cube', [1, 1, 0], 1).area).toBeCloseTo(Math.SQRT2, 12);
    expect(sectionOf('cube', [1, 1, 1], 0.5).area).toBeCloseTo(Math.sqrt(3) / 8, 12);
    expect(sectionOf('cube', [1, 1, 1], 1).area).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(sectionOf('cube', [1, 1, 1], 1.5).area).toBeCloseTo(3 * Math.sqrt(3) / 4, 12);
    expect(sectionOf('cube', [1, 1, 1], 3).hull.length).toBe(1);
    expect(sectionOf('square-pyramid', [1, 0, 0], 0).area).toBeCloseTo(8, 12);
    expect(sectionOf('square-pyramid', [1, 1, 1], 0).area).toBeCloseTo(8.66025, 5);
    expect(keptVolume('cube', [1, 2, 2], 1.5)).toBeCloseTo(0.13542, 5);
    expect(keptVolume('square-pyramid', [1, 1, 1], 0)).toBeCloseTo(15.33333, 4);
    // the pyramid by similarity: the section at height h above the base is a square of side 4 (4 - h) / 4
    for (let D = -8; D <= 8; D += 1) {
        const h = D / 4 + 2;
        expect(sectionOf('square-pyramid', [0, 0, 1], D / 4).area).toBeCloseTo(h === 4 ? 0 : (((4 - h) / 4) * 4) ** 2, 9);
    }
});

// ---- the text ---------------------------------------------------------------------------------------------------------------------------------

describe('the numbers each step quotes are those of its scene and prompts, in sl and en', () => {
    const lessonOf = (id: string) => id.startsWith('sv1') ? cubeSectionsLesson : prismPyramidSectionsLesson;
    const stepTexts = (id: string, language: Language) => {
        const lesson = lessonOf(id);
        const step = stepOf(id);
        const examples = (lesson.workedExamples ?? []).filter(example => example.id === step.workedExampleId);
        return {
            scene: step.scene!.expectedState[language],
            all: [step.explanation[language], step.observationPrompt[language], ...step.expectedObservations.map(o => o[language]), step.scene!.expectedState[language],
                ...examples.map(example => example.check?.[language] ?? '')].join(' '),
        };
    };
    const area = (solid: SolidName, normal: Vec, d: number) => sectionOf(solid, normal, d).area;
    const kept = (solid: SolidName, normal: Vec, d: number) => keptVolume(solid, normal, d);
    const diag: Vec = [1, 1, 1];
    /** The numbers each step must quote, from the recomputation: [value, decimals]. */
    const quotes = (id: string): readonly (readonly [number, number])[] => {
        switch (id) {
            case 'sv1-parallel': return [[area('cube', [0, 0, 1], 0.5), 0], [kept('cube', [0, 0, 1], 0.5), 1], [kept('cube', [0, 0, 1], 0.25), 2], [0.5, 2], [0.25, 2]];
            case 'sv1-tilt': return [[area('cube', [1, 1, 0], 1), 5], [area('cube', [1, 2, 2], 1.5), 2], [1.5, 1]];
            case 'sv1-diagonal': return [[area('cube', diag, 0.5), 5], [area('cube', diag, 1), 5], [area('cube', diag, 1.25), 5], [area('cube', diag, 1.5), 5], [area('cube', diag, 2), 5], [kept('cube', diag, 1.5), 1],
                [0.5, 1], [1.25, 2], [1.5, 1], [3, 0]];
            case 'sv1-corners': return [[area('cube', diag, 1.25), 5], [area('cube', diag, 1), 5], [1.25, 2], [6, 0]];
            case 'sv1-argument': return [[area('cube', [2, 3, 4], 4), 4], [area('cube', [2, 3, 4], 4.5), 4], [4.5, 1], [7, 0]];
            case 'sv1-free': return [[area('cube', diag, 0.5), 5], [area('cube', [0, 0, 1], 0.5), 0], [area('cube', [2, 3, 4], 4), 4], [area('cube', diag, 1.5), 5]];
            case 'sv2-prism': return [[area('square-prism', [0, 0, 1], 0), 0], [kept('square-prism', [0, 0, 1], -1), 0], [kept('square-prism', [0, 0, 1], 0), 0], [kept('square-prism', [0, 0, 1], 1), 0], [SLICES['square-prism'].volume, 0], [3, 0]];
            case 'sv2-pyramid': return [[area('square-pyramid', [0, 0, 1], -1), 0], [area('square-pyramid', [0, 0, 1], 0), 0], [area('square-pyramid', [0, 0, 1], 1), 0], [area('square-pyramid', [0, 0, 1], -2), 0],
                [SLICES['square-pyramid'].volume, 3], [4, 0]];
            case 'sv2-similar': return [[area('square-pyramid', [0, 0, 1], 0), 0], [area('square-pyramid', [0, 0, 1], -1), 0], [area('square-pyramid', [0, 0, 1], 1), 0], [16, 0]];
            case 'sv2-apex': return [[area('square-pyramid', [1, 0, 0], 0), 0], [area('square-pyramid', [1, 1, 0], 0), 5], [area('square-pyramid', [1, 2, 1], 2), 5]];
            case 'sv2-pentagon': return [[area('square-pyramid', diag, 0), 5], [kept('square-pyramid', diag, 0), 5], [area('square-pyramid', diag, -2), 4], [area('square-pyramid', [2, 3, 4], 0), 5],
                [area('square-pyramid', [1, 1, 2], 0), 5], [1.75, 2]];
            case 'sv2-free': return [[area('square-pyramid', [1, 0, 0], 0), 0], [area('square-pyramid', [0, 0, 1], 0), 0], [area('square-pyramid', diag, 0), 5], [area('square-pyramid', diag, -1), 5]];
            default: throw new Error(`no quotes for ${id}`);
        }
    };
    for (const language of ['sl', 'en'] as const) {
        test(`${language}: the numbers of each step, recomputed, appear in its text; the prompted offsets and normals appear in the prompt or the step`, () => {
            for (const id of stepIds) {
                const {all} = stepTexts(id, language);
                for (const [value, digits] of quotes(id)) expect({id, quote: q(value, digits, language), found: hasQuote(all, value, digits, language)}).toEqual({id, quote: q(value, digits, language), found: true});
            }
            for (const {id, config} of allPrompted) {
                const {all} = stepTexts(id, language);
                expect({id, offset: q(dOf(config), 2, language), found: hasNumber(all, q(dOf(config), 2, language))}).toEqual({id, offset: q(dOf(config), 2, language), found: true});
                const [a, b, c] = config.normal;
                const compact = `(${a},${b},${c})`;
                const spaced = [a, b, c].map(value => `\\(${value}\\)`).join(', ');
                expect({id, normal: config.normal, found: prose(all).includes(compact.replace(/\\/g, '')) || all.includes(`\\\\(${a},${b},${c}\\\\)`) || all.includes(spaced.replace(/\\/g, '\\\\')) || all.includes(`${a}\\\\), \\\\(${b}\\\\), \\\\(${c}`)})
                    .toEqual({id, normal: config.normal, found: true});
            }
            // the scene lines state the sides and the area of their scene, but no step line names the answer of its own prediction
            for (const id of ['sv1-parallel', 'sv1-tilt', 'sv1-corners', 'sv1-argument', 'sv2-apex', 'sv2-pentagon']) {
                const config = SCENES[id];
                expect({id, area: hasQuote(stepTexts(id, language).scene, area(config.solid, config.normal, dOf(config)), id === 'sv1-argument' ? 4 : id === 'sv1-parallel' ? 0 : 5, language)}).toEqual({id, area: true});
            }
        });
    }

    test('no step reveals the answer to its prediction before the learner can make it (explanation, prompt and scene line); the answers are in the observations', () => {
        // what the learner reads before the observation: the explanation and the prompt; the scene line (expectedState) is authoring text that no view shows, but sv1-diagonal's must not name the answer either
        const before = (id: string, language: Language) => [stepOf(id).explanation[language], stepOf(id).observationPrompt[language], ...(id === 'sv1-diagonal' ? [stepOf(id).scene!.expectedState[language]] : [])].join(' ');
        for (const language of ['sl', 'en'] as const) {
            // sv1-tilt: the area and side count of the tilted plane
            expect(hasQuote(before('sv1-tilt', language), Math.SQRT2, 5, language)).toBe(false);
            expect(before('sv1-tilt', language)).not.toMatch(language === 'sl' ? /ostane|spremeni|večji od ploskve/ : /keeps|changes|larger than a face/);
            // sv1-diagonal: the hexagon and its area at the offset 1,5 are asked for
            const diagonal = before('sv1-diagonal', language);
            expect(hasQuote(diagonal, area('cube', [1, 1, 1], 1.5), 5, language)).toBe(false);
            expect(diagonal).not.toMatch(language === 'sl' ? /šestkotnik|šest stranic/i : /hexagon|six sides/i);
            // sv1-argument: the maximum number of sides
            const argument = before('sv1-argument', language);
            expect(argument).not.toMatch(language === 'sl' ? /šest stranic|šest ploskev|največ šest|sedemkotnik ni/i : /six sides|six faces|at most six|no heptagon|not possible/i);
            expect(stepOf('sv1-argument').title[language]).not.toMatch(language === 'sl' ? /ni\b/ : /no heptagon/i);
            // sv2-apex: the base, the height and the area of the triangle
            const apex = before('sv2-apex', language);
            expect(hasNumber(apex, '8')).toBe(false);
            expect(apex).not.toMatch(language === 'sl' ? /osnovnica \\\\\(4|višina \\\\\(4/ : /base \\\\\(4|height \\\\\(4/);
        }
        // the answers are in the observations of the same steps
        expect(stepOf('sv1-diagonal').expectedObservations[0].sl).toContain('šestkotnik');
        expect(stepOf('sv1-argument').expectedObservations[0].en).toContain('at most six sides');
    });

    test('learner-facing text: no internal lesson ids, the term oglišče (not vogal), approximate irrational areas, the coplanar-face case, no empty guidance', () => {
        const everything = JSON.stringify([...lessons, solidsChapter]);
        expect(everything).not.toMatch(/\bSV[0-9]\b/);
        expect(everything).not.toMatch(/vogal/i);
        for (const language of ['sl', 'en'] as const) {
            const approx = language === 'sl' ? /približno/ : /approximate/;
            // every irrational area quoted in a step is introduced as approximate in the sentence that quotes it (five or four decimals, not the exact area 0,75 or the integers)
            for (const id of stepIds) {
                const sentences = prose(Object.values(stepTexts(id, language)).join(' ')).split(/(?<=[.;:])\s+(?=[A-ZČŠŽ])/);
                for (const sentence of sentences) {
                    for (const match of sentence.matchAll(/\d+[.,]\d{4,5}(?![0-9])/g)) {
                        const value = Number(match[0].replace(',', '.'));
                        const irrational = ![0.5, 0.75, 0.25, 0.13542, 15.33333, 21.333].includes(value) && Math.abs(value * 1e5 - Math.round(value * 1e5)) < 1e-6;
                        if (irrational) expect({id, sentence, approximate: approx.test(sentence) || /zaokrož|rounded/.test(sentence)}).toEqual({id, sentence, approximate: true});
                    }
                }
            }
            const argumentText = stepOf('sv1-argument').expectedObservations[0][language];
            expect(argumentText).toMatch(language === 'sl' ? /vsebuje ploskev/ : /contains a face/);
            expect(stepOf('sv2-pentagon').explanation[language]).toMatch(language === 'sl' ? /vsebuje ploskev/ : /contains a face/);
        }
        for (const step of allSteps()) for (const language of ['sl', 'en'] as const) expect({id: step.id, ok: step.title[language].length > 3 && step.observationPrompt[language].length > 20}).toEqual({id: step.id, ok: true});
    });

    test('the lesson and chapter sources have no single-backslash math delimiter anywhere (titles, summaries, edge cases, prerequisites included)', () => {
        const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
        for (const file of ['src/learning/content/solidsGuidedLessons.ts', 'src/learning/content/solidsChapter.ts']) {
            const lines = readFileSync(resolve(repoRoot, file), 'utf8').split('\n').filter(line => !line.includes('String.raw'));
            for (const [index, line] of lines.entries()) expect({file, line: index, single: /(?<!\\)\\[()[\]a-zA-Z]/.test(line.replace(/\\\\/g, '@@'))}).toEqual({file, line: index, single: false});
        }
    });

    test('the worked examples compute the numbers of the recomputation', () => {
        const hexagon = cubeSectionsLesson.workedExamples![0];
        const side = Math.hypot(0.5, 0.5);
        expect(side).toBeCloseTo(Math.SQRT2 / 2, 12);
        const hexagonArea = 3 * Math.sqrt(3) / 2 * side * side;
        expect(hexagonArea).toBeCloseTo(sectionOf('cube', [1, 1, 1], 1.5).area, 12);
        expect(hexagon.resultLatex).toContain(q(hexagonArea, 5, 'sl').replace(',', '{,}'));
        expect(hexagon.resultLatex).toContain('\\approx');
        for (const language of ['sl', 'en'] as const) {
            expect(hasQuote(hexagon.check![language].replace(/\{,\}/g, language === 'sl' ? ',' : '.'), hexagonArea, 5, language)).toBe(true);
            expect(hasQuote(hexagon.title[language], 1.5, 1, language)).toBe(true);
        }
        // the six cut points of the hexagon are the midpoints of six edges, adjacent ones sqrt(2)/2 apart
        const cut = sectionOf('cube', [1, 1, 1], 1.5).points;
        expect(cut.length).toBe(6);
        for (const p of cut) expect(p.filter(value => Math.abs(value - 0.5) < 1e-9).length).toBe(1);
        const scale = pyramidAt(-1);
        const example = prismPyramidSectionsLesson.workedExamples![0];
        expect(scale).toBeCloseTo(9, 12);
        expect(example.resultLatex).toBe('A(1)=\\frac{9}{16}\\cdot16=9');
        expect(sectionOf('square-pyramid', [0, 0, 1], -1).area).toBeCloseTo(9, 9);
        for (const language of ['sl', 'en'] as const) expect(hasNumber(example.check![language], '9')).toBe(true);
        // the formula block: A(h) = ((H - h) / H)^2 B with H = 4, B = 16 for the offsets -2 .. 2
        for (let D = -8; D <= 7; D += 1) expect(sectionOf('square-pyramid', [0, 0, 1], D / 4).area).toBeCloseTo(pyramidAt(D / 4), 9);
    });

    const pyramidAt = (d: number) => ((4 - (d + 2)) / 4) ** 2 * 16;

    test('the chapter prose quotes the numbers the recomputation gives', () => {
        const [cube, pyramid] = solidsChapter.sections;
        const prosePart = (section: typeof cube, language: Language) => [...section.paragraphs, ...Object.values(section.investigationPrompts ?? {})].map(paragraph => paragraph[language]).join(' ');
        for (const language of ['sl', 'en'] as const) {
            const first = prosePart(cube, language);
            const second = prosePart(pyramid, language);
            const quotedCube: [number, number][] = [[area('cube', [1, 1, 1], 0.5), 5], [area('cube', [1, 1, 1], 1.5), 5], [6, 0], [12, 0], [8, 0], [3, 0], [0.25, 2], [1.5, 1], [4, 0], [1, 0]];
            for (const [value, digits] of quotedCube) expect({shown: q(value, digits, language), found: hasQuote(first, value, digits, language)}).toEqual({shown: q(value, digits, language), found: true});
            // the cube has 6 faces, 12 edges and 8 vertices; the polytope used by the recomputation has the same counts
            expect([POLYTOPES.cube.vertices.length, POLYTOPES.cube.edges.length]).toEqual([8, 12]);
            const quotedPyramid: [number, number][] = [[pyramidAt(-1), 0], [pyramidAt(0), 0], [area('square-pyramid', [1, 1, 1], 0), 5], [5, 0], [16, 0], [4, 0], [3, 0], [2, 0]];
            for (const [value, digits] of quotedPyramid) expect({shown: q(value, digits, language), found: hasQuote(second, value, digits, language)}).toEqual({shown: q(value, digits, language), found: true});
            expect(second).toContain(language === 'sl' ? 'približno' : 'approximately');
            // the prose claims about the unit cube: the section at x + y + z = 1/2 has side sqrt 2 / 2 and area approximately 0,21651; the plane x + y + z = 3 touches only the vertex (1,1,1)
            expect(sectionOf('cube', [1, 1, 1], 0.5).points.every((p, i, all) => Math.abs(Math.hypot(p[0] - all[(i + 1) % 3][0], p[1] - all[(i + 1) % 3][1], p[2] - all[(i + 1) % 3][2]) - Math.SQRT2 / 2) < 1e-9)).toBe(true);
            expect(sectionOf('cube', [1, 1, 1], 3).points).toEqual([[1, 1, 1]]);
            // the section at z = d with 0 < d < 1 meets only the four lateral faces of the cube: the section is a unit square (area 1) in each case
            for (const d of [0.1, 0.5, 0.9]) expect(sectionOf('cube', [0, 0, 1], d).area).toBeCloseTo(1, 12);
        }
        // the prerequisite link points at a section of the analysis chapter that exists
        expect(solidsChapter.prerequisiteLinks![0].path).toBe('/bezeg-2.0/learn/analysis#integrability');
        expect(familyChapters.find(chapter => chapter.id === 'analysis')!.sections.map(section => section.id)).toContain('integrability');
    });

    test('the chapter owns both lessons and they are the ones the test checks', () => {
        const owned = getChapterOwnedLessons('solids')!;
        expect(owned.lesson('cube-sections')!.steps.map(step => step.id)).toEqual(cubeSectionsLesson.steps.map(step => step.id));
        expect(owned.lesson('pyramid-sections')!.steps.map(step => step.id)).toEqual(prismPyramidSectionsLesson.steps.map(step => step.id));
        expect(cubeSectionsLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(prismPyramidSectionsLesson.steps.map(step => step.order)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(new Set(allSteps().map(step => step.scene!.id)).size).toBe(12);
        expect(allSteps().every(step => step.scene)).toBe(true);
        expect(allSteps().map(step => step.id)).toEqual(stepIds);
        expect(solidsChapter.sections.map(section => section.id)).toEqual(['cube-sections', 'pyramid-sections']);
    });
});
